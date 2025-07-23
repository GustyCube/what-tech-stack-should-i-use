export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle static assets
    if (url.pathname.startsWith('/_next/static/') || 
        url.pathname.startsWith('/static/') ||
        url.pathname.includes('.')) {
      // Try to fetch the static asset
      return fetch(request);
    }
    
    // For all other routes (SPA routing), serve index.html
    const indexUrl = new URL('/index.html', request.url);
    const indexRequest = new Request(indexUrl, request);
    
    const response = await fetch(indexRequest);
    
    // Add proper headers for HTML content
    if (response.ok) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Content-Type', 'text/html; charset=utf-8');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
    
    return response;
  },
};