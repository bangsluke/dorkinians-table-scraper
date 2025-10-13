// github-actions-runner.js - Simple runner for GitHub Actions
require('dotenv').config();
const runScraper = require('./scrape-and-upload');

async function main() {
  console.log('🚀 Starting GitHub Actions scraper job...');
  
  // Check if required environment variables are set
  const requiredEnvVars = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'SHEET_ID'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    process.exit(1);
  }
  
  try {
    await runScraper();
    console.log('✅ GitHub Actions scraper job completed successfully!');
    process.exit(0); // Explicitly exit after success
  } catch (error) {
    console.error('❌ Scraper failed:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
