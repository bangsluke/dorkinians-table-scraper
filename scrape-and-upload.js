// scrape-and-upload.js
require("dotenv").config();
const puppeteer = require("puppeteer");
const { google } = require("googleapis");

async function scrapeTable() {
  console.log("🌐 Launching browser...");
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
  
  console.log("📄 Creating new page...");
  const page = await browser.newPage();
  
  // Set longer timeout and better error handling
  page.setDefaultTimeout(120000); // 2 minutes
  page.setDefaultNavigationTimeout(120000); // 2 minutes
  
  console.log("🔗 Navigating to website...");
  let pageLoaded = false;
  
  // Try multiple approaches with increasing timeouts
  const attempts = [
    { waitUntil: "networkidle2", timeout: 120000, name: "networkidle2" },
    { waitUntil: "domcontentloaded", timeout: 120000, name: "domcontentloaded" },
    { waitUntil: "load", timeout: 120000, name: "load" }
  ];
  
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      console.log(`🔄 Attempt ${i + 1}: ${attempt.name} (${attempt.timeout}ms timeout)`);
      await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
        waitUntil: attempt.waitUntil,
        timeout: attempt.timeout
      });
      console.log(`✅ Page loaded successfully with ${attempt.name}`);
      pageLoaded = true;
      
      // Wait a bit more for dynamic content
      if (attempt.waitUntil !== "networkidle2") {
        await page.waitForTimeout(5000);
      }
      break;
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
    await browser.close();
    throw new Error("Failed to load page after all attempts");
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

  await browser.close();
  return tableData;
}

async function uploadToSheet(data) {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
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
  const data = await scrapeTable();
  console.log(`📊 Scraped ${data.length} rows from the first table`);
  console.log(`📋 Table headers: ${data[0] ? data[0].join(' | ') : 'None'}`);
  await uploadToSheet(data);
}

module.exports = runScraper;

// Allow direct execution
if (require.main === module) {
  runScraper().catch(console.error);
}