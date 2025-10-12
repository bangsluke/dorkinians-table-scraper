// dynamic-content-scraper.js - Handle dynamically loaded content
const puppeteer = require("puppeteer");

async function dynamicContentScraper() {
  console.log("🔄 Trying dynamic content scraper...");
  
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
      '--disable-renderer-backgrounding'
    ]
  });
  
  const page = await browser.newPage();
  
  try {
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    console.log("🔗 Navigating to website...");
    await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    
    console.log("⏱️ Waiting for dynamic content to load...");
    
    // Wait for the table to load with actual data (not "Data loading")
    try {
      await page.waitForFunction(() => {
        const tables = document.querySelectorAll('table');
        if (tables.length < 2) return false;
        
        const secondTable = tables[1];
        const rows = secondTable.querySelectorAll('tr');
        
        // Check if we have meaningful data (not just "Data loading")
        for (let row of rows) {
          const cells = row.querySelectorAll('td, th');
          for (let cell of cells) {
            const text = cell.innerText.trim();
            if (text && !text.includes('Data loading') && text.length > 2) {
              return true;
            }
          }
        }
        return false;
      }, { timeout: 30000 });
      
      console.log("✅ Dynamic content loaded successfully");
      
    } catch (waitError) {
      console.log("⚠️ Timeout waiting for dynamic content, proceeding with current state");
    }
    
    // Check tables
    const tables = await page.$$("table");
    console.log(`📊 Found ${tables.length} tables`);
    
    if (tables.length >= 2) {
      const leagueTable = tables[1];
      const tableData = await leagueTable.evaluate(table => {
        const rows = Array.from(table.querySelectorAll("tr"));
        return rows.map(row =>
          Array.from(row.querySelectorAll("td, th")).map(cell => cell.innerText.trim())
        );
      });
      
      // Filter out empty rows and loading messages
      const filteredData = tableData.filter(row => 
        row.length > 0 && 
        row.some(cell => cell.trim() !== '') &&
        !row.some(cell => cell.includes('Data loading')) &&
        !row.some(cell => cell.includes('click here'))
      );
      
      console.log(`📊 Extracted ${filteredData.length} rows after filtering`);
      
      if (filteredData.length > 1) {
        console.log("✅ Found meaningful table data");
        await browser.close();
        return filteredData;
      } else {
        console.log("⚠️ No meaningful data found after filtering");
      }
    }
    
  } catch (error) {
    console.log(`❌ Dynamic content scraper failed: ${error.message}`);
  }
  
  await browser.close();
  return null;
}

module.exports = { dynamicContentScraper };
