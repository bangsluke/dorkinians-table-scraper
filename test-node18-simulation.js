// test-node18-simulation.js - Simulate Node.js 18 behavior
console.log("🧪 Simulating Node.js 18 environment...");

// Check if we can detect any Node.js version specific behavior
const nodeVersion = process.version;
console.log("Current Node version:", nodeVersion);

// Test Puppeteer with explicit timeout settings
const puppeteer = require("puppeteer");

async function testNode18Simulation() {
  console.log("🌐 Launching browser with Node.js 18 simulation...");
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set timeouts exactly as in our code
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);
  
  console.log("📊 Timeout settings:");
  console.log("- Default timeout:", page._timeoutSettings.timeout());
  console.log("- Navigation timeout:", page._timeoutSettings.navigationTimeout());
  
  // Test the exact same URL and settings
  console.log("🔗 Testing with target website...");
  
  try {
    await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
      waitUntil: "networkidle2",
      timeout: 120000
    });
    console.log("✅ Page loaded successfully");
  } catch (error) {
    console.error("❌ Navigation failed:", error.message);
    console.error("Error type:", error.constructor.name);
    
    if (error.message.includes('timeout')) {
      console.error("🔍 TIMEOUT ANALYSIS:");
      console.error("- Error message:", error.message);
      console.error("- Contains '30000':", error.message.includes('30000'));
      console.error("- Contains '120000':", error.message.includes('120000'));
      console.error("- Contains 'Navigation timeout':", error.message.includes('Navigation timeout'));
    }
  }
  
  await browser.close();
}

testNode18Simulation().catch(console.error);
