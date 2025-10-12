// proxy-service-approach.js - Use free proxy services to bypass blocking
const puppeteer = require("puppeteer");

async function proxyServiceApproach() {
  console.log("🔄 Trying proxy service approach...");
  
  // List of free proxy services (these are examples - in production you'd want more reliable ones)
  const proxyServices = [
    {
      name: "Free Proxy List",
      proxy: "http://proxy-server.scraperapi.com:8001",
      auth: null
    },
    {
      name: "No Proxy - Direct",
      proxy: null,
      auth: null
    }
  ];
  
  for (let i = 0; i < proxyServices.length; i++) {
    const service = proxyServices[i];
    console.log(`🔄 Trying proxy service ${i + 1}: ${service.name}`);
    
    try {
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
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--disable-ipc-flooding-protection',
          ...(service.proxy ? [`--proxy-server=${service.proxy}`] : [])
        ]
      });
      
      const page = await browser.newPage();
      
      try {
        // Set up authentication if needed
        if (service.auth) {
          await page.authenticate(service.auth);
        }
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Set minimal headers
        await page.setExtraHTTPHeaders({
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        });
        
        // Try to navigate with multiple strategies
        let navigationSuccess = false;
        const strategies = [
          { waitUntil: "load", timeout: 20000 },
          { waitUntil: "domcontentloaded", timeout: 30000 },
          { waitUntil: "networkidle0", timeout: 45000 }
        ];
        
        for (let strategy of strategies) {
          try {
            console.log(`🔄 Trying navigation with ${strategy.waitUntil} (${strategy.timeout}ms timeout)`);
            await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", strategy);
            navigationSuccess = true;
            console.log(`✅ Navigation successful with ${strategy.waitUntil}`);
            break;
          } catch (error) {
            console.log(`⚠️ Navigation failed with ${strategy.waitUntil}: ${error.message}`);
            if (strategy === strategies[strategies.length - 1]) {
              throw error; // Re-throw the last error if all strategies fail
            }
          }
        }
        
        if (!navigationSuccess) {
          throw new Error("All navigation strategies failed");
        }
        
        console.log(`✅ Success with ${service.name}!`);
        
        // Wait for dynamic content to load
        console.log("⏱️ Waiting for dynamic content to load...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Try to click on any "click here" links to trigger league table loading
        try {
          const clickableLinks = await page.$$('a');
          for (let link of clickableLinks) {
            const text = await link.evaluate(el => el.textContent);
            const href = await link.evaluate(el => el.href);
            
            if (text.includes('click here') || text.includes('South Division 10') || href.includes('South Division 10')) {
              console.log("🖱️ Clicking on league table link to trigger loading...");
              await link.click();
              await new Promise(resolve => setTimeout(resolve, 3000));
              break;
            }
          }
        } catch (clickError) {
          console.log("⚠️ Could not click league table link:", clickError.message);
        }
        
        // Check if we got the content
        const tables = await page.$$("table");
        console.log(`📊 Found ${tables.length} tables with ${service.name}`);
        
        if (tables.length >= 2) {
          // Extract the actual data from the second table
          const leagueTable = tables[1];
          const tableData = await leagueTable.evaluate(table => {
            const rows = Array.from(table.querySelectorAll("tr"));
            return rows.map(row =>
              Array.from(row.querySelectorAll("td, th")).map(cell => cell.innerText.trim())
            );
          });
          
          // Debug: Show first few rows of raw data
          console.log("🔍 Raw table data (first 5 rows):");
          tableData.slice(0, 5).forEach((row, index) => {
            console.log(`Row ${index}: [${row.join(' | ')}]`);
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
          
          console.log(`📊 Filtered to ${filteredData.length} league table rows`);
          
          // Debug: Show filtered data
          if (filteredData.length > 0) {
            console.log("🔍 Filtered data (first 5 rows):");
            filteredData.slice(0, 5).forEach((row, index) => {
              console.log(`Filtered ${index}: [${row.join(' | ')}]`);
            });
          }
          
          if (filteredData.length > 1) {
            console.log(`📊 Found meaningful data: ${filteredData.length} rows`);
            await browser.close();
            return filteredData;
          } else {
            console.log(`⚠️ Table data appears to be loading or empty: ${filteredData.length} meaningful rows`);
          }
        }
        
      } catch (error) {
        console.log(`❌ ${service.name} failed: ${error.message}`);
        await browser.close();
      }
      
    } catch (error) {
      console.log(`❌ Failed to launch browser with ${service.name}: ${error.message}`);
    }
  }
  
  return null;
}

module.exports = { proxyServiceApproach };
