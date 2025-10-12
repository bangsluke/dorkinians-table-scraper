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
          '--disable-javascript',
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
        
        // Try to navigate
        await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
          waitUntil: "domcontentloaded",
          timeout: 30000
        });
        
        console.log(`✅ Success with ${service.name}!`);
        
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
          
          // Filter out empty rows and check if we have meaningful data
          const filteredData = tableData.filter(row => 
            row.length > 0 && 
            row.some(cell => cell.trim() !== '') &&
            !row.some(cell => cell.includes('Data loading'))
          );
          
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
