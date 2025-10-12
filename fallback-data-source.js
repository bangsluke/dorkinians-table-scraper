// fallback-data-source.js - Fallback when website is inaccessible
const { google } = require("googleapis");

// Sample data structure based on typical league table format
const FALLBACK_DATA = [
  ["POS", "", "P", "W", "D", "L", "F", "A", "GD", "PTS"],
  ["1", "Team A", "10", "8", "2", "0", "25", "5", "20", "26"],
  ["2", "Team B", "10", "7", "2", "1", "22", "8", "14", "23"],
  ["3", "Team C", "10", "6", "3", "1", "20", "10", "10", "21"],
  ["4", "Team D", "10", "5", "2", "3", "18", "12", "6", "17"],
  ["5", "Team E", "10", "4", "3", "3", "15", "15", "0", "15"],
  ["6", "Team F", "10", "3", "4", "3", "12", "12", "0", "13"],
  ["7", "Team G", "10", "2", "5", "3", "10", "14", "-4", "11"],
  ["8", "Team H", "10", "1", "3", "6", "8", "20", "-12", "6"],
  ["9", "Team I", "10", "0", "2", "8", "5", "25", "-20", "2"],
  ["10", "Team J", "10", "0", "1", "9", "3", "28", "-25", "1"]
];

async function uploadFallbackData() {
  console.log("🔄 Using fallback data due to website inaccessibility...");
  
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: "Dorkinians Data!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { 
        values: [
          ["⚠️ FALLBACK DATA - Website inaccessible at", new Date().toISOString()],
          ["", "", "", "", "", "", "", "", "", ""],
          ...FALLBACK_DATA
        ]
      },
    });

    console.log("✅ Fallback data uploaded to Google Sheets");
    return true;
  } catch (error) {
    console.error("❌ Failed to upload fallback data:", error.message);
    return false;
  }
}

module.exports = { uploadFallbackData, FALLBACK_DATA };
