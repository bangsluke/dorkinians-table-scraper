// curl-scraping-approach.js - Use curl to bypass blocking
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function curlScrapingApproach() {
  console.log("🔄 Trying curl-based scraping approach...");
  
  const curlCommands = [
    // Basic curl with different user agents
    {
      name: "Googlebot User Agent",
      command: `curl -s -L -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" "https://www.southernamateurleague.co.uk/south-division-10.html" --max-time 30`
    },
    {
      name: "Bingbot User Agent", 
      command: `curl -s -L -A "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)" "https://www.southernamateurleague.co.uk/south-division-10.html" --max-time 30`
    },
    {
      name: "Simple curl",
      command: `curl -s -L "https://www.southernamateurleague.co.uk/south-division-10.html" --max-time 30`
    },
    {
      name: "curl with headers",
      command: `curl -s -L -H "Accept: text/html" -H "User-Agent: Mozilla/5.0 (compatible; Googlebot/2.1)" "https://www.southernamateurleague.co.uk/south-division-10.html" --max-time 30`
    }
  ];
  
  for (let i = 0; i < curlCommands.length; i++) {
    const curlCmd = curlCommands[i];
    console.log(`🔄 Trying curl approach ${i + 1}: ${curlCmd.name}`);
    
    try {
      const { stdout, stderr } = await execAsync(curlCmd.command);
      
      if (stderr) {
        console.log(`⚠️ Curl stderr: ${stderr}`);
      }
      
      if (stdout && stdout.length > 1000) {
        console.log(`✅ Curl succeeded with ${curlCmd.name} - got ${stdout.length} characters`);
        
        // Parse the HTML to extract table data
        const tableData = parseHtmlForTableData(stdout);
        if (tableData && tableData.length > 0) {
          console.log(`📊 Successfully extracted ${tableData.length} rows using curl`);
          return tableData;
        } else {
          console.log("⚠️ No table data found in curl response");
        }
      } else {
        console.log(`❌ Curl ${curlCmd.name} returned insufficient data: ${stdout ? stdout.length : 0} characters`);
      }
      
    } catch (error) {
      console.log(`❌ Curl ${curlCmd.name} failed: ${error.message}`);
    }
  }
  
  return null;
}

function parseHtmlForTableData(html) {
  try {
    console.log("🔍 Parsing HTML for table data...");
    
    // Look for all tables in the HTML
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = html.match(tableRegex);
    
    if (!tables || tables.length === 0) {
      console.log("❌ No tables found in HTML");
      return null;
    }
    
    console.log(`📊 Found ${tables.length} tables in HTML`);
    
    // Look for the league table by checking for specific league table indicators
    let targetTable = null;
    let targetTableIndex = -1;
    
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      
      // Check if this table contains the specific league table headers
      if (table.includes('POS') && table.includes('PTS') && table.includes('W') && table.includes('D') && table.includes('L') && table.includes('F') && table.includes('A') && table.includes('GD')) {
        console.log(`📊 Found league standings table at index ${i}`);
        targetTable = table;
        targetTableIndex = i;
        break;
      }
    }
    
    // If no specific league table found, try the second table (index 1)
    if (!targetTable && tables.length >= 2) {
      console.log("📊 Using second table as fallback");
      targetTable = tables[1];
      targetTableIndex = 1;
    }
    
    // If still no table, use the first one
    if (!targetTable && tables.length >= 1) {
      console.log("📊 Using first table as fallback");
      targetTable = tables[0];
      targetTableIndex = 0;
    }
    
    if (!targetTable) {
      console.log("❌ No suitable table found");
      return null;
    }
    
    console.log(`📊 Using table at index ${targetTableIndex}`);
    
    // Extract rows from the target table
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = targetTable.match(rowRegex);
    
    if (!rows) {
      console.log("❌ No rows found in target table");
      return null;
    }
    
    console.log(`📊 Found ${rows.length} rows in target table`);
    
    const tableData = rows.map((row, rowIndex) => {
      // Extract cells
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells = row.match(cellRegex);
      
      if (!cells) {
        return [];
      }
      
      const rowData = cells.map(cell => {
        // Remove HTML tags and get text content
        let text = cell.replace(/<[^>]*>/g, '').trim();
        
        // Clean up common HTML entities and extra whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
      });
      
      // Log first few rows for debugging
      if (rowIndex < 3) {
        console.log(`📋 Row ${rowIndex}: [${rowData.join(' | ')}]`);
      }
      
      return rowData;
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
    
    console.log(`📊 Extracted ${filteredData.length} meaningful rows after filtering`);
    
    // If we have meaningful data, return it
    if (filteredData.length > 0) {
      return filteredData;
    }
    
    // If no meaningful data, try to find any table with multiple rows
    const allRows = tableData.filter(row => row.length > 0 && row.some(cell => cell.trim() !== ''));
    console.log(`📊 Found ${allRows.length} total non-empty rows across all tables`);
    
    if (allRows.length > 1) {
      console.log("📊 Using all non-empty rows as fallback");
      return allRows;
    }
    
    return null;
    
  } catch (error) {
    console.log(`❌ HTML parsing failed: ${error.message}`);
    return null;
  }
}

module.exports = { curlScrapingApproach };
