// test-github-actions-simulation.js - Simulate GitHub Actions environment
console.log("🧪 Simulating GitHub Actions environment...");

// Simulate GitHub Actions environment variables
process.env.GOOGLE_CLIENT_EMAIL = "test@example.com";
process.env.GOOGLE_PRIVATE_KEY = "test-key";
process.env.SHEET_ID = "test-sheet-id";

// Clear module cache to ensure fresh load
Object.keys(require.cache).forEach(key => {
  if (key.includes('scrape-and-upload') || key.includes('github-actions-runner')) {
    delete require.cache[key];
  }
});

// Test the exact same code path as GitHub Actions
const runScraper = require('./scrape-and-upload');

async function testGitHubActionsSimulation() {
  try {
    console.log("🚀 Starting GitHub Actions simulation...");
    await runScraper();
    console.log("✅ GitHub Actions simulation completed successfully!");
  } catch (error) {
    console.error("❌ GitHub Actions simulation failed:", error.message);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Check if it's a timeout error
    if (error.message.includes('timeout')) {
      console.error("🔍 TIMEOUT ERROR DETECTED");
      console.error("Error message contains 'timeout':", error.message.includes('timeout'));
      console.error("Error message contains '30000':", error.message.includes('30000'));
      console.error("Error message contains '120000':", error.message.includes('120000'));
    }
    
    process.exit(1);
  }
}

testGitHubActionsSimulation();
