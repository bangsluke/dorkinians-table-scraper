// test-bot-detection.js - Test for bot detection mechanisms
const puppeteer = require("puppeteer");

async function testBotDetection() {
  console.log("🤖 Testing for bot detection mechanisms...");
  
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
  
  // Set realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Monitor console messages for bot detection
  page.on('console', msg => {
    if (msg.text().toLowerCase().includes('bot') || 
        msg.text().toLowerCase().includes('blocked') ||
        msg.text().toLowerCase().includes('captcha')) {
      console.log('🚨 Bot detection message:', msg.text());
    }
  });
  
  // Monitor network requests
  page.on('request', request => {
    if (request.url().includes('bot') || 
        request.url().includes('captcha') ||
        request.url().includes('block')) {
      console.log('🚨 Suspicious request:', request.url());
    }
  });
  
  // Monitor responses
  page.on('response', response => {
    if (response.status() === 403 || response.status() === 429) {
      console.log('🚨 Blocked response:', response.status(), response.url());
    }
  });
  
  try {
    console.log("🔗 Loading website...");
    await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
      waitUntil: "load",
      timeout: 30000
    });
    
    console.log("✅ Page loaded successfully");
    
    // Check for common bot detection indicators
    const title = await page.title();
    console.log("📄 Page title:", title);
    
    // Check for CAPTCHA
    const captcha = await page.$('iframe[src*="recaptcha"], .captcha, #captcha');
    if (captcha) {
      console.log("🚨 CAPTCHA detected!");
    }
    
    // Check for bot detection scripts
    const botScripts = await page.$$eval('script', scripts => 
      scripts.map(script => script.textContent).filter(text => 
        text && (text.includes('bot') || text.includes('captcha') || text.includes('cloudflare'))
      )
    );
    
    if (botScripts.length > 0) {
      console.log("🚨 Bot detection scripts found:", botScripts.length);
    }
    
    // Check if we can access the tables
    const tables = await page.$$("table");
    console.log("📊 Tables found:", tables.length);
    
    if (tables.length === 0) {
      console.log("🚨 No tables found - possible blocking");
      
      // Check page content for blocking messages
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes('blocked') || bodyText.includes('access denied') || bodyText.includes('forbidden')) {
        console.log("🚨 Blocking message found in page content");
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
  
  await browser.close();
}

testBotDetection().catch(console.error);
