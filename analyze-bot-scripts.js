// analyze-bot-scripts.js - Analyze bot detection scripts
const puppeteer = require("puppeteer");

async function analyzeBotScripts() {
  console.log("🔍 Analyzing bot detection scripts...");
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
    waitUntil: "load",
    timeout: 30000
  });
  
  // Get all script content
  const scripts = await page.$$eval('script', scripts => 
    scripts.map((script, index) => ({
      index,
      src: script.src,
      content: script.textContent ? script.textContent.substring(0, 500) : 'No content'
    }))
  );
  
  console.log("📜 Scripts found:", scripts.length);
  
  scripts.forEach((script, i) => {
    if (script.content.includes('bot') || script.content.includes('captcha') || script.content.includes('cloudflare')) {
      console.log(`\n🚨 Bot-related script ${i}:`);
      console.log("Source:", script.src || 'Inline');
      console.log("Content preview:", script.content);
    }
  });
  
  // Check for Cloudflare
  const cloudflare = await page.$eval('body', body => 
    body.innerHTML.includes('cloudflare') || 
    body.innerHTML.includes('cf-') ||
    body.innerHTML.includes('checking your browser')
  );
  
  if (cloudflare) {
    console.log("🚨 Cloudflare protection detected!");
  }
  
  await browser.close();
}

analyzeBotScripts().catch(console.error);
