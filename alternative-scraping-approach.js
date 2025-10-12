// alternative-scraping-approach.js - Alternative approach for GitHub Actions
const puppeteer = require("puppeteer");

async function alternativeScrapingApproach() {
  console.log("🔄 Trying alternative scraping approach for GitHub Actions...");
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images',
      '--disable-javascript', // Try without JS first
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      '--disable-ipc-flooding-protection'
    ]
  });
  
  const page = await browser.newPage();
  
  // Try different user agents
  const userAgents = [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/118.0'
  ];
  
  for (let i = 0; i < userAgents.length; i++) {
    const userAgent = userAgents[i];
    console.log(`🔄 Trying user agent ${i + 1}/${userAgents.length}: ${userAgent.substring(0, 50)}...`);
    
    try {
      await page.setUserAgent(userAgent);
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Set minimal headers
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });
      
      // Try to navigate
      await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
        waitUntil: "domcontentloaded",
        timeout: 15000
      });
      
      console.log(`✅ Success with user agent ${i + 1}!`);
      
      // Check if we got the content
      const tables = await page.$$("table");
      console.log(`📊 Found ${tables.length} tables`);
      
      if (tables.length >= 2) {
        console.log("✅ Found sufficient tables - alternative approach works!");
        await browser.close();
        return true;
      }
      
    } catch (error) {
      console.log(`❌ User agent ${i + 1} failed: ${error.message}`);
    }
  }
  
  await browser.close();
  return false;
}

module.exports = { alternativeScrapingApproach };
