// scrape-and-upload.js
require("dotenv").config();
const puppeteer = require("puppeteer");
const { google } = require("googleapis");

async function scrapeTable() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto("https://www.southernamateurleague.co.uk/south-division-10.html", {
    waitUntil: "networkidle2",
  });

  const tableData = await page.$$eval("table tr", rows =>
    rows.map(row =>
      Array.from(row.querySelectorAll("td, th")).map(cell => cell.innerText.trim())
    )
  );

  await browser.close();
  return tableData;
}

async function uploadToSheet(data) {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: "Dorkinians Data!F1",
    valueInputOption: "RAW",
    requestBody: { values: data },
  });

  console.log("✅ Data uploaded to Google Sheets");
}

module.exports = async function runScraper() {
  const data = await scrapeTable();
  await uploadToSheet(data);
};