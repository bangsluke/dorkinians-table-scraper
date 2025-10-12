// scrape-and-upload.js
require("dotenv").config();
const puppeteer = require("puppeteer");
const { google } = require("googleapis");

async function scrapeTable() {
  console.log("🌐 Launching browser...");
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for GitHub Actions
  });
  
  console.log("📄 Creating new page...");
  const page = await browser.newPage();
  
  // Set longer timeout and better error handling
  page.setDefaultTimeout(60000); // 60 seconds
  page.setDefaultNavigationTimeout(60000); // 60 seconds
  
  console.log("🔗 Navigating to website...");
  try {
    await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
      waitUntil: "networkidle2",
      timeout: 60000
    });
    console.log("✅ Page loaded successfully");
  } catch (error) {
    console.log("⚠️ First attempt failed, trying with domcontentloaded...");
    try {
      await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
        waitUntil: "domcontentloaded",
        timeout: 60000
      });
      console.log("✅ Page loaded with domcontentloaded");
      // Wait a bit more for dynamic content
      await page.waitForTimeout(3000);
    } catch (secondError) {
      console.log("⚠️ Second attempt failed, trying with load event...");
      try {
        await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
          waitUntil: "load",
          timeout: 60000
        });
        console.log("✅ Page loaded with load event");
        // Wait for content to load
        await page.waitForTimeout(5000);
      } catch (thirdError) {
        console.error("❌ All loading attempts failed:", thirdError.message);
        await browser.close();
        throw thirdError;
      }
    }
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