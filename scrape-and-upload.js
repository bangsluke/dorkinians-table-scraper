// scrape-and-upload.js
require("dotenv").config();
const puppeteer = require("puppeteer");
const { google } = require("googleapis");

async function scrapeTable() {
  console.log("🌐 Launching browser...");
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  console.log("🔗 Navigating to website...");
  await page.goto("https://fulltime.thefa.com/index.html?divisionseason=311980811", {
    waitUntil: "networkidle2",
    timeout: 30000
  });

  console.log("🔍 Looking for tables...");
  const tables = await page.$$("table");
  console.log(`📊 Found ${tables.length} tables`);
  
  if (tables.length === 0) {
    console.error("❌ No tables found");
    await browser.close();
    throw new Error("No tables found on page");
  }
  
  const leagueTable = tables[0]; // First table
  console.log("✅ Using first table as league table");
  
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
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  
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
    const data = await scrapeTable();
    console.log(`📊 Scraped ${data.length} rows`);
    await uploadToSheet(data);
  } catch (error) {
    console.error("❌ Scraping failed:", error.message);
    throw error;
  }
}

module.exports = runScraper;

// Allow direct execution
if (require.main === module) {
  runScraper().catch(console.error);
}