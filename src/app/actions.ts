'use server';

export async function collectAnalytics(stackName: string) {
  // In a real application, you would store this in a database (e.g., Firebase Firestore).
  // For this example, we'll just log it to the server console.
  console.log(`Analytics: User was recommended the "${stackName}" stack.`);
  return { success: true };
}
