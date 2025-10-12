// github-actions-runner.js - Enhanced runner for GitHub Actions
require('dotenv').config();
const runScraper = require('./scrape-and-upload');

async function main() {
  console.log('🚀 Starting GitHub Actions scraper job...');
  console.log('🔧 GitHub Actions Environment:');
  console.log('- Runner OS:', process.env.RUNNER_OS || 'Unknown');
  console.log('- Runner Arch:', process.env.RUNNER_ARCH || 'Unknown');
  console.log('- Node Version:', process.version);
  console.log('- Working Directory:', process.cwd());
  console.log('- Environment Variables:', Object.keys(process.env).length);
  
  // Check if required environment variables are set
  const requiredEnvVars = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'SHEET_ID'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
  
  // Retry mechanism for GitHub Actions
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}...`);
      await runScraper();
      console.log('✅ GitHub Actions scraper job completed successfully!');
      return; // Success, exit the function
    } catch (error) {
      lastError = error;
      console.log(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = attempt * 10000; // 10s, 20s delays
        console.log(`⏱️ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  console.error('❌ GitHub Actions scraper job failed after all retries:');
  console.error('Error message:', lastError.message);
  console.error('Error stack:', lastError.stack);
  
  // Additional debugging for GitHub Actions
  if (lastError.message.includes('timeout')) {
    console.log('🔍 Timeout detected - this might be a network issue in GitHub Actions');
  }
  if (lastError.message.includes('Navigation')) {
    console.log('🔍 Navigation error - website might be blocking GitHub Actions IPs');
  }
  if (lastError.message.includes('net::')) {
    console.log('🔍 Network error - check internet connectivity in GitHub Actions');
  }
  
  process.exit(1);
}

main();
