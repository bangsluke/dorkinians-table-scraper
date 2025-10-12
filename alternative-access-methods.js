// alternative-access-methods.js - Alternative methods to access the website
const puppeteer = require("puppeteer");
const https = require('https');

async function tryAlternativeAccess() {
  console.log("🔄 Trying alternative access methods...");
  
  // Method 1: Try different user agents that might not be blocked
  const userAgents = [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 (compatible; DuckDuckBot/1.1; +https://duckduckgo.com/duckduckbot.html)',
    'Mozilla/5.0 (compatible; archive.org_bot +http://www.archive.org/details/archive.org_bot)',
    'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
    'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://www.ahrefs.com/robot/)',
    'Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)',
    'Mozilla/5.0 (compatible; DotBot/1.1; http://www.opensiteexplorer.org/dotbot)',
    'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
    'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)'
  ];
  
  for (let i = 0; i < userAgents.length; i++) {
    const userAgent = userAgents[i];
    console.log(`🔄 Trying user agent ${i + 1}/${userAgents.length}: ${userAgent.substring(0, 50)}...`);
    
    try {
      const result = await tryWithUserAgent(userAgent);
      if (result) {
        console.log(`✅ Success with user agent ${i + 1}!`);
        return result;
      }
    } catch (error) {
      console.log(`❌ User agent ${i + 1} failed: ${error.message}`);
    }
  }
  
  // Method 2: Try direct HTTP request with different headers
  console.log("🔄 Trying direct HTTP request...");
  try {
    const result = await tryDirectHttpRequest();
    if (result) {
      console.log("✅ Direct HTTP request succeeded!");
      return result;
    }
  } catch (error) {
    console.log(`❌ Direct HTTP request failed: ${error.message}`);
  }
  
  return null;
}

async function tryWithUserAgent(userAgent) {
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
      '--disable-ipc-flooding-protection'
    ]
  });
  
  const page = await browser.newPage();
  
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
      timeout: 20000
    });
    
    // Check if we got the content
    const tables = await page.$$("table");
    console.log(`📊 Found ${tables.length} tables with ${userAgent.substring(0, 30)}...`);
    
    if (tables.length >= 2) {
      // Extract the actual data
      const leagueTable = tables[1];
      const tableData = await leagueTable.evaluate(table => {
        const rows = Array.from(table.querySelectorAll("tr"));
        return rows.map(row =>
          Array.from(row.querySelectorAll("td, th")).map(cell => cell.innerText.trim())
        );
      });
      
      await browser.close();
      return tableData;
    }
    
  } catch (error) {
    await browser.close();
    throw error;
  }
  
  await browser.close();
  return null;
}

async function tryDirectHttpRequest() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    };
    
    const req = https.request("https://www.southernamateurleague.co.uk/south-division-10.html", options, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Parse HTML to extract table data
        try {
          const tableData = parseHtmlForTableData(data);
          if (tableData && tableData.length > 0) {
            resolve(tableData);
          } else {
            reject(new Error('No table data found in HTML'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

function parseHtmlForTableData(html) {
  // Simple HTML parsing to extract table data
  // This is a basic implementation - in production you'd want to use a proper HTML parser
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = html.match(tableRegex);
  
  if (!tables || tables.length < 2) {
    return null;
  }
  
  // Get the second table (index 1)
  const targetTable = tables[1];
  
  // Extract rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = targetTable.match(rowRegex);
  
  if (!rows) {
    return null;
  }
  
  const tableData = rows.map(row => {
    // Extract cells
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells = row.match(cellRegex);
    
    if (!cells) {
      return [];
    }
    
    return cells.map(cell => {
      // Remove HTML tags and get text content
      return cell.replace(/<[^>]*>/g, '').trim();
    });
  });
  
  return tableData;
}

module.exports = { tryAlternativeAccess };
