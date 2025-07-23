// Worker that handles hashed filenames from Wrangler
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      
      // Debug endpoint to list all KV keys
      if (url.pathname === '/debug') {
        if (!env.__STATIC_CONTENT) {
          return new Response('KV namespace not available', { status: 500 });
        }
        
        try {
          const keys = await env.__STATIC_CONTENT.list();
          return new Response(`
            <html>
              <head><title>KV Debug</title></head>
              <body>
                <h1>KV Store Contents</h1>
                <p><strong>Total Keys:</strong> ${keys.keys.length}</p>
                <ul>
                  ${keys.keys.map(key => `<li>${key.name}</li>`).join('')}
                </ul>
              </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
        } catch (e) {
          return new Response(`Debug Error: ${e.message}`, { status: 500 });
        }
      }
      
      // Check if we have the KV namespace
      if (!env.__STATIC_CONTENT) {
        return new Response('KV namespace not available', { status: 500 });
      }
      
      // Function to find a file by base name (handles hashed filenames)
      async function findFile(baseName) {
        const keys = await env.__STATIC_CONTENT.list();
        
        // Look for exact match first
        const exactMatch = keys.keys.find(key => key.name === baseName);
        if (exactMatch) {
          return exactMatch.name;
        }
        
        // Look for hashed version (e.g., index.abc123.html for index.html)
        const hashedMatch = keys.keys.find(key => {
          const parts = baseName.split('.');
          if (parts.length === 2) {
            // For files like index.html, look for index.hash.html
            const nameWithoutExt = parts[0];
            const extension = parts[1];
            const pattern = new RegExp(`^${nameWithoutExt}\\.[a-f0-9]+\\.${extension}$`);
            return pattern.test(key.name);
          }
          return false;
        });
        
        return hashedMatch ? hashedMatch.name : null;
      }
      
      // Determine which file to serve
      let requestedFile = url.pathname.slice(1); // Remove leading /
      
      // Root path should serve index.html
      if (requestedFile === '' || requestedFile === '/') {
        requestedFile = 'index.html';
      }
      
      // For app routes (no file extension), serve index.html
      if (!requestedFile.includes('.') && !requestedFile.startsWith('_next/')) {
        requestedFile = 'index.html';
      }
      
      // Find the actual file (with or without hash)
      const actualFileName = await findFile(requestedFile);
      
      if (actualFileName) {
        const file = await env.__STATIC_CONTENT.get(actualFileName);
        
        if (file) {
          // Determine content type
          let contentType = 'text/plain';
          if (actualFileName.endsWith('.html')) contentType = 'text/html; charset=utf-8';
          if (actualFileName.endsWith('.js')) contentType = 'application/javascript';
          if (actualFileName.endsWith('.css')) contentType = 'text/css';
          if (actualFileName.endsWith('.json')) contentType = 'application/json';
          if (actualFileName.endsWith('.ico')) contentType = 'image/x-icon';
          
          return new Response(file, {
            headers: { 'Content-Type': contentType }
          });
        }
      }
      
      // For static assets that aren't found, return 404
      if (requestedFile.startsWith('_next/') || requestedFile.includes('.')) {
        return new Response('Not Found', { status: 404 });
      }
      
      // File not found - try to serve index.html for SPA routing
      const indexFileName = await findFile('index.html');
      if (indexFileName) {
        const indexFile = await env.__STATIC_CONTENT.get(indexFileName);
        if (indexFile) {
          return new Response(indexFile, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
      }
      
      return new Response('Application not found', { status: 404 });
      
    } catch (error) {
      return new Response(`Worker Error: ${error.message}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  },
};