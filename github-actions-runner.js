// github-actions-runner.js - Simple runner for GitHub Actions
require('dotenv').config();
const runScraper = require('./scrape-and-upload');

async function main() {
  try {
    console.log('🚀 Starting GitHub Actions scraper job...');
    await runScraper();
    console.log('✅ GitHub Actions scraper job completed successfully!');
  } catch (error) {
    console.error('❌ GitHub Actions scraper job failed:', error.message);
    process.exit(1);
  }
}

main();
