// scrape-and-upload.js
require("dotenv").config();
const puppeteer = require("puppeteer");
const { google } = require("googleapis");

async function scrapeTable() {
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for GitHub Actions
  });
  const page = await browser.newPage();
  await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
    waitUntil: "networkidle2",
  });

  const tables = await page.$$("table");
  const leagueTable = tables[1]; // Second table (index 1)
  
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