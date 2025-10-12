// test-explicit-timeout-override.js - Test explicit timeout overrides
const puppeteer = require("puppeteer");

async function testExplicitTimeoutOverride() {
  console.log("🧪 Testing explicit timeout overrides...");
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Don't set any default timeouts - test with explicit overrides only
  console.log("📊 Default timeout settings (before override):");
  console.log("- Default timeout:", page._timeoutSettings.timeout());
  console.log("- Navigation timeout:", page._timeoutSettings.navigationTimeout());
  
  // Test with explicit timeout in goto
  console.log("🔗 Testing with explicit 120s timeout in goto...");
  
  try {
    await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
      waitUntil: "networkidle2",
      timeout: 120000
    });
    console.log("✅ Page loaded successfully with explicit timeout");
  } catch (error) {
    console.error("❌ Navigation failed:", error.message);
    
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

testExplicitTimeoutOverride().catch(console.error);
