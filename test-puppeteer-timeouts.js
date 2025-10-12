// test-puppeteer-timeouts.js - Test Puppeteer internal timeouts
const puppeteer = require("puppeteer");

async function testPuppeteerTimeouts() {
  console.log("🧪 Testing Puppeteer timeout behavior...");
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set our custom timeouts
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);
  
  console.log("📊 Timeout settings:");
  console.log("- Default timeout:", page._timeoutSettings.timeout());
  console.log("- Navigation timeout:", page._timeoutSettings.navigationTimeout());
  
  // Test with a slow website to see what timeout actually triggers
  console.log("🔗 Testing with slow website...");
  
  try {
    // Use a website that's known to be slow
    await page.goto("https://httpbin.org/delay/35", {
      waitUntil: "networkidle2",
      timeout: 120000
    });
    console.log("✅ Page loaded successfully");
  } catch (error) {
    console.error("❌ Navigation failed:", error.message);
    console.error("Error type:", error.constructor.name);
    
    // Check if it's a timeout error and what timeout was used
    if (error.message.includes('timeout')) {
      console.error("🔍 TIMEOUT ANALYSIS:");
      console.error("- Error message:", error.message);
      console.error("- Contains '30000':", error.message.includes('30000'));
      console.error("- Contains '120000':", error.message.includes('120000'));
    }
  }
  
  await browser.close();
}

testPuppeteerTimeouts().catch(console.error);
