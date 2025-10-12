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
      timeout: 15000
    });
    
    console.log("⏱️ Waiting for dynamic content to load...");
    
    // Try to click on any "click here" links to trigger league table loading
    try {
      const clickableLinks = await page.$$('a');
      for (let link of clickableLinks) {
        const text = await link.evaluate(el => el.textContent);
        const href = await link.evaluate(el => el.href);
        
        if (text.includes('click here') || text.includes('South Division 10') || href.includes('South Division 10')) {
          console.log("🖱️ Clicking on league table link to trigger loading...");
          await link.click();
          await page.waitForTimeout(3000); // Wait a bit for the click to take effect
          break;
        }
      }
    } catch (clickError) {
      console.log("⚠️ Could not click league table link:", clickError.message);
    }
    
    // Wait for the league table to load with actual standings data
    try {
      await page.waitForFunction(() => {
        const tables = document.querySelectorAll('table');
        if (tables.length < 2) return false;
        
        const secondTable = tables[1];
        const rows = secondTable.querySelectorAll('tr');
        
        // Look for league table indicators (POS, PTS, W, D, L, F, A, GD)
        for (let row of rows) {
          const cells = Array.from(row.querySelectorAll('td, th')).map(cell => cell.innerText.trim());
          const rowText = cells.join(' ').toLowerCase();
          
          // Check if this row contains league table headers or data
          if (rowText.includes('pos') && rowText.includes('pts') && rowText.includes('w') && rowText.includes('d') && rowText.includes('l')) {
            return true; // Found league table headers
          }
          
          // Check if this looks like a league table row with team names and stats
          if (cells.length >= 5) {
            const hasNumericStats = cells.some(cell => {
              const num = parseInt(cell);
              return !isNaN(num) && num >= 0 && num <= 100;
            });
            const hasTeamName = cells.some(cell => {
              return cell.length > 2 && !cell.match(/^\d+$/) && !cell.match(/^[A-Z]$/) && !cell.includes('Data loading');
            });
            
            if (hasNumericStats && hasTeamName) {
              return true; // Found league table data
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
      
      // Filter for league table data only - look for rows that contain league table indicators
      const filteredData = tableData.filter(row => {
        // Must have at least 5 columns
        if (row.length < 5) return false;
        
        // Must not contain loading messages or other non-league content
        if (row.some(cell => cell.includes('Data loading') || cell.includes('click here') || cell.includes('var lrcode'))) {
          return false;
        }
        
        // Check if this looks like a league table row by looking for common patterns
        const rowText = row.join(' ').toLowerCase();
        
        // Skip header rows and non-data rows
        if (rowText.includes('pos') && rowText.includes('pts') && rowText.includes('w') && rowText.includes('d') && rowText.includes('l')) {
          return true; // This is likely a header row
        }
        
        // Look for rows that have numeric values that could be league stats
        const hasNumericValues = row.some(cell => {
          const num = parseInt(cell);
          return !isNaN(num) && num >= 0 && num <= 100; // Reasonable range for league stats
        });
        
        // Look for team names (not just numbers or single characters)
        const hasTeamName = row.some(cell => {
          return cell.length > 2 && !cell.match(/^\d+$/) && !cell.match(/^[A-Z]$/);
        });
        
        return hasNumericValues && hasTeamName;
      });
      
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
