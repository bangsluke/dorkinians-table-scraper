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
    // Simple HTML parsing to extract table data
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = html.match(tableRegex);
    
    if (!tables || tables.length < 2) {
      console.log("❌ No tables found in HTML");
      return null;
    }
    
    console.log(`📊 Found ${tables.length} tables in HTML`);
    
    // Get the second table (index 1)
    const targetTable = tables[1];
    
    // Extract rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = targetTable.match(rowRegex);
    
    if (!rows) {
      console.log("❌ No rows found in target table");
      return null;
    }
    
    console.log(`📊 Found ${rows.length} rows in target table`);
    
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
    
    // Filter out empty rows
    const filteredData = tableData.filter(row => row.length > 0 && row.some(cell => cell.trim() !== ''));
    
    console.log(`📊 Extracted ${filteredData.length} non-empty rows`);
    return filteredData;
    
  } catch (error) {
    console.log(`❌ HTML parsing failed: ${error.message}`);
    return null;
  }
}

module.exports = { curlScrapingApproach };
