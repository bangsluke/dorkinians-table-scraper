// scrape-and-upload.js
require("dotenv").config();
const puppeteer = require("puppeteer");
const { google } = require("googleapis");
const { testNetworkConnectivity } = require("./network-diagnostics");
const { tryAlternativeAccess } = require("./alternative-access-methods");
const { curlScrapingApproach } = require("./curl-scraping-approach");
const { proxyServiceApproach } = require("./proxy-service-approach");
const { dynamicContentScraper } = require("./dynamic-content-scraper");

async function scrapeTable() {
  console.log("🌐 Launching browser...");
  console.log("🔧 Environment info:");
  console.log("- Node version:", process.version);
  console.log("- Platform:", process.platform);
  console.log("- Architecture:", process.arch);
  console.log("- CI:", process.env.CI);
  console.log("- GITHUB_ACTIONS:", process.env.GITHUB_ACTIONS);
  
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
  
  console.log("📄 Creating new page...");
  const page = await browser.newPage();
  
  // Enhanced stealth techniques to avoid bot detection
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set additional headers to appear more like a real browser
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  });
  
  // Add random delay to appear more human-like
  const delay = Math.random() * 2000 + 1000; // 1-3 seconds
  console.log(`⏱️ Adding ${Math.round(delay)}ms delay to appear human-like`);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Force timeout settings - multiple approaches for GitHub Actions compatibility
  page.setDefaultTimeout(120000); // 2 minutes
  page.setDefaultNavigationTimeout(120000); // 2 minutes
  
  // Additional timeout enforcement
  page._timeoutSettings.setDefaultTimeout(120000);
  page._timeoutSettings.setDefaultNavigationTimeout(120000);
  
  console.log("📊 Timeout settings applied:");
  console.log("- Default timeout:", page._timeoutSettings.timeout());
  console.log("- Navigation timeout:", page._timeoutSettings.navigationTimeout());
  
  console.log("🔗 Navigating to website...");
  let pageLoaded = false;
  
  // Monitor for blocking responses and network issues
  page.on('response', response => {
    if (response.status() === 403) {
      console.log('🚨 403 Forbidden - Possible IP blocking');
    } else if (response.status() === 429) {
      console.log('🚨 429 Too Many Requests - Rate limiting detected');
    } else if (response.status() === 503) {
      console.log('🚨 503 Service Unavailable - Server overload or maintenance');
    } else if (response.status() >= 400) {
      console.log(`⚠️ HTTP ${response.status()} - ${response.url()}`);
    }
  });
  
  // Monitor for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🚨 Console error:', msg.text());
    }
  });
  
  // Monitor for page errors
  page.on('pageerror', error => {
    console.log('🚨 Page error:', error.message);
  });
  
  // Try multiple approaches with GitHub Actions optimized timeouts
  const attempts = [
    { waitUntil: "load", timeout: 10000, name: "load (10s)" },
    { waitUntil: "domcontentloaded", timeout: 10000, name: "domcontentloaded (10s)" },
    { waitUntil: "load", timeout: 15000, name: "load (15s)" },
    { waitUntil: "domcontentloaded", timeout: 15000, name: "domcontentloaded (15s)" },
    { waitUntil: "load", timeout: 30000, name: "load (30s)" }
  ];
  
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      console.log(`🔄 Attempt ${i + 1}: ${attempt.name} (${attempt.timeout}ms timeout)`);
      
      // Force timeout settings before each attempt
      page.setDefaultTimeout(attempt.timeout);
      page.setDefaultNavigationTimeout(attempt.timeout);
      
      // Explicit timeout in goto call with additional safety
      const navigationPromise = page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
        waitUntil: attempt.waitUntil,
        timeout: attempt.timeout
      });
      
      // Add a manual timeout wrapper as additional safety
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Manual timeout after ${attempt.timeout}ms`)), attempt.timeout);
      });
      
      await Promise.race([navigationPromise, timeoutPromise]);
      console.log(`✅ Page loaded successfully with ${attempt.name}`);
      
      // Check if we have the required tables before considering it successful
      const tables = await page.$$("table");
      console.log(`📊 Found ${tables.length} tables after loading`);
      
      if (tables.length >= 2) {
        console.log("✅ Sufficient tables found - page load successful");
        pageLoaded = true;
        break;
      } else {
        console.log(`⚠️ Insufficient tables found (${tables.length}), trying next strategy...`);
        
        // Check for blocking messages in page content
        const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
        if (bodyText.includes('blocked') || bodyText.includes('access denied') || 
            bodyText.includes('forbidden') || bodyText.includes('captcha')) {
          console.log("🚨 Blocking message detected in page content");
          console.log("Page content preview:", bodyText.substring(0, 200));
        }
        
        // Wait a bit more for dynamic content
        if (attempt.waitUntil !== "networkidle2") {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    } catch (error) {
      console.log(`⚠️ Attempt ${i + 1} failed: ${error.message}`);
      if (i === attempts.length - 1) {
        console.error("❌ All loading attempts failed");
        await browser.close();
        throw error;
      }
    }
  }
  
  if (!pageLoaded) {
    console.log("❌ All loading attempts failed");
    console.log("🔍 Attempting to get page content for debugging...");
    
    try {
      const pageContent = await page.evaluate(() => document.body.innerText);
      console.log("📄 Page content preview:", pageContent.substring(0, 500));
      
      const pageTitle = await page.title();
      console.log("📄 Page title:", pageTitle);
      
      const currentUrl = page.url();
      console.log("🔗 Current URL:", currentUrl);
      
    } catch (debugError) {
      console.log("❌ Could not get page content:", debugError.message);
    }
    
    await browser.close();
    throw new Error("Failed to load page after all attempts - check logs for details");
  }

  console.log("🔍 Looking for tables...");
  const tables = await page.$$("table");
  console.log(`📊 Found ${tables.length} tables`);
  
  if (tables.length < 2) {
    console.error("❌ Not enough tables found. Expected at least 2, got:", tables.length);
    await browser.close();
    throw new Error("Insufficient tables found on page");
  }
  
  const leagueTable = tables[1]; // Second table (index 1)
  console.log("✅ Using second table as league table");
  
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
  
  console.log(`📊 Filtered to ${filteredData.length} league table rows`);
  
  // Debug: Show first few rows of raw data
  console.log("🔍 Raw table data (first 5 rows):");
  tableData.slice(0, 5).forEach((row, index) => {
    console.log(`Row ${index}: [${row.join(' | ')}]`);
  });
  
  // Debug: Show filtered data
  if (filteredData.length > 0) {
    console.log("🔍 Filtered data (first 5 rows):");
    filteredData.slice(0, 5).forEach((row, index) => {
      console.log(`Filtered ${index}: [${row.join(' | ')}]`);
    });
  }

  await browser.close();
  return filteredData;
}

async function uploadToSheet(data) {
  // Handle different private key formats for GitHub Actions
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  
  // Remove quotes if present
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  
  // Handle different newline formats
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: "Dorkinians Data!D1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: data },
  });

  console.log("✅ Data uploaded to Google Sheets");
}

async function runScraper() {
  try {
    // Run network diagnostics first
    const networkStatus = await testNetworkConnectivity();
    
    // Check if website is blocking us (HTTP 406)
    if (networkStatus && networkStatus.targetSiteStatus === 406) {
      console.log("🚨 Website is blocking GitHub Actions (HTTP 406) - trying multiple bypass methods...");
      
      // Try dynamic content scraper first (handles JavaScript loading)
      console.log("🔄 Trying dynamic content scraper...");
      const dynamicData = await dynamicContentScraper();
      if (dynamicData && dynamicData.length > 0) {
        console.log(`📊 Successfully scraped ${dynamicData.length} rows using dynamic content scraper`);
        console.log(`📋 Table headers: ${dynamicData[0] ? dynamicData[0].join(' | ') : 'None'}`);
        await uploadToSheet(dynamicData);
        return;
      }
      
      // Try curl approach
      console.log("🔄 Trying curl-based scraping...");
      const curlData = await curlScrapingApproach();
      if (curlData && curlData.length > 0) {
        console.log(`📊 Successfully scraped ${curlData.length} rows using curl`);
        console.log(`📋 Table headers: ${curlData[0] ? curlData[0].join(' | ') : 'None'}`);
        await uploadToSheet(curlData);
        return;
      }
      
      // Try proxy service approach
      console.log("🔄 Trying proxy service approach...");
      const proxyData = await proxyServiceApproach();
      if (proxyData && proxyData.length > 0) {
        console.log(`📊 Successfully scraped ${proxyData.length} rows using proxy service`);
        console.log(`📋 Table headers: ${proxyData[0] ? proxyData[0].join(' | ') : 'None'}`);
        await uploadToSheet(proxyData);
        return;
      }
      
      // Try alternative access methods as last resort
      console.log("🔄 Trying alternative access methods...");
      const alternativeData = await tryAlternativeAccess();
      if (alternativeData && alternativeData.length > 0) {
        console.log(`📊 Successfully scraped ${alternativeData.length} rows using alternative method`);
        console.log(`📋 Table headers: ${alternativeData[0] ? alternativeData[0].join(' | ') : 'None'}`);
        await uploadToSheet(alternativeData);
        return;
      } else {
        throw new Error("All bypass methods failed - website is completely blocked");
      }
    }
    
  const data = await scrapeTable();
    console.log(`📊 Scraped ${data.length} rows from the first table`);
    console.log(`📋 Table headers: ${data[0] ? data[0].join(' | ') : 'None'}`);
  await uploadToSheet(data);
  } catch (error) {
    console.error("❌ Main scraping failed:", error.message);
    
    // Check if it's a network/timeout issue
    if (error.message.includes('timeout') || error.message.includes('Navigation timeout')) {
      console.log("🔄 Network issue detected, trying multiple bypass methods...");
      
      // Try dynamic content scraper first
      console.log("🔄 Trying dynamic content scraper...");
      const dynamicData = await dynamicContentScraper();
      if (dynamicData && dynamicData.length > 0) {
        console.log(`📊 Successfully scraped ${dynamicData.length} rows using dynamic content scraper`);
        console.log(`📋 Table headers: ${dynamicData[0] ? dynamicData[0].join(' | ') : 'None'}`);
        await uploadToSheet(dynamicData);
        return;
      }
      
      // Try curl approach
      console.log("🔄 Trying curl-based scraping...");
      const curlData = await curlScrapingApproach();
      if (curlData && curlData.length > 0) {
        console.log(`📊 Successfully scraped ${curlData.length} rows using curl`);
        console.log(`📋 Table headers: ${curlData[0] ? curlData[0].join(' | ') : 'None'}`);
        await uploadToSheet(curlData);
        return;
      }
      
      // Try proxy service approach
      console.log("🔄 Trying proxy service approach...");
      const proxyData = await proxyServiceApproach();
      if (proxyData && proxyData.length > 0) {
        console.log(`📊 Successfully scraped ${proxyData.length} rows using proxy service`);
        console.log(`📋 Table headers: ${proxyData[0] ? proxyData[0].join(' | ') : 'None'}`);
        await uploadToSheet(proxyData);
        return;
      }
      
      // Try alternative access methods as last resort
      console.log("🔄 Trying alternative access methods...");
      const alternativeData = await tryAlternativeAccess();
      if (alternativeData && alternativeData.length > 0) {
        console.log(`📊 Successfully scraped ${alternativeData.length} rows using alternative method`);
        console.log(`📋 Table headers: ${alternativeData[0] ? alternativeData[0].join(' | ') : 'None'}`);
        await uploadToSheet(alternativeData);
        return;
      } else {
        throw new Error("All bypass methods failed - unable to scrape data");
      }
    }
    
    // Re-throw the original error if all methods failed
    throw error;
  }
}

module.exports = runScraper;

// Allow direct execution
if (require.main === module) {
  runScraper().catch(console.error);
}