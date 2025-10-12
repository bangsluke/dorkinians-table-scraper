// curl-scraping-approach.js - Use curl to bypass blocking
const { exec } = require('child_process');
const { promisify } = require('util');
const fetch = require('node-fetch');

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
        const tableData = await parseHtmlForTableData(stdout);
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

async function parseHtmlForTableData(html) {
  try {
    console.log("🔍 Parsing HTML for table data...");

    // First, try to find API endpoints or data sources
    console.log("🔍 Looking for API endpoints or data sources...");
    
    // Look for AJAX calls, API endpoints, or data URLs
    const apiPatterns = [
      // AJAX calls
      /\.ajax\([^)]*url:\s*['"]([^'"]+)['"]/gi,
      // Fetch calls
      /fetch\(['"]([^'"]+)['"]/gi,
      // XMLHttpRequest
      /open\(['"](GET|POST)['"],\s*['"]([^'"]+)['"]/gi,
      // Data URLs
      /data-[^=]*="([^"]*\.(json|xml|csv)[^"]*)"/gi,
      // Script sources
      /<script[^>]*src=['"]([^'"]*\.(js|json)[^'"]*)['"]/gi
    ];
    
    const foundEndpoints = new Set();
    for (let pattern of apiPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (let match of matches) {
          const urlMatch = match.match(/['"]([^'"]+)['"]/);
          if (urlMatch) {
            const url = urlMatch[1];
            if (url.includes('league') || url.includes('division') || url.includes('standings') || url.includes('table')) {
              foundEndpoints.add(url);
              console.log(`🔗 Found potential data endpoint: ${url}`);
            }
          }
        }
      }
    }
    
    // Try to fetch data from found endpoints
    for (let endpoint of foundEndpoints) {
      try {
        console.log(`🔄 Trying to fetch data from: ${endpoint}`);
        const fullUrl = endpoint.startsWith('http') ? endpoint : `https://www.southernamateurleague.co.uk/${endpoint}`;
        const response = await fetch(fullUrl);
        const data = await response.text();
        console.log(`✅ Got ${data.length} characters from ${endpoint}`);
        
        // Try to parse as JSON
        try {
          const jsonData = JSON.parse(data);
          if (Array.isArray(jsonData) && jsonData.length > 0) {
            console.log(`📊 Found JSON data with ${jsonData.length} items`);
            // Check if this looks like league data
            if (jsonData.some(item => 
              typeof item === 'object' && 
              item !== null && 
              (item.team || item.name || item.position || item.pts || item.wins || item.draws || item.losses)
            )) {
              console.log("📊 Found potential league data in API response");
              return jsonData.map(item => {
                if (typeof item === 'object' && item !== null) {
                  return Object.values(item).map(val => String(val || ''));
                }
                return [String(item)];
              });
            }
          }
        } catch (e) {
          // Not JSON, continue
        }
      } catch (e) {
        console.log(`❌ Failed to fetch from ${endpoint}: ${e.message}`);
      }
    }
    
    // Look for embedded league data in JavaScript or JSON
    console.log("🔍 Looking for embedded league data in JavaScript...");
    
    // Look for various patterns that might contain league data
    const patterns = [
      // JSON arrays
      /var\s+\w+\s*=\s*(\[.*?\]);/g,
      // Object literals
      /var\s+\w+\s*=\s*(\{.*?\});/g,
      // Data attributes
      /data-[^=]*="([^"]*league[^"]*)"/gi,
      // Script tags with data
      /<script[^>]*>([\s\S]*?league[\s\S]*?)<\/script>/gi,
      // Hidden divs with data
      /<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
    ];
    
    for (let pattern of patterns) {
      const matches = html.match(pattern);
      if (matches) {
        console.log(`📊 Found ${matches.length} potential data blocks with pattern`);
        for (let match of matches) {
          try {
            // Try to extract JSON from the match
            const jsonMatch = match.match(/(\[.*?\]|\{.*?\})/);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[1]);
              if (Array.isArray(data) && data.length > 0) {
                console.log(`📊 Found JSON array with ${data.length} items`);
                // Check if this looks like league data
                if (data.some(item => 
                  typeof item === 'object' && 
                  item !== null && 
                  (item.team || item.name || item.position || item.pts || item.wins || item.draws || item.losses)
                )) {
                  console.log("📊 Found potential league data in JSON");
                  return data.map(item => {
                    if (typeof item === 'object' && item !== null) {
                      return Object.values(item).map(val => String(val || ''));
                    }
                    return [String(item)];
                  });
                }
              }
            }
          } catch (e) {
            // Continue to next match
          }
        }
      }
    }
    
    // Look for specific league table patterns in the HTML
    console.log("🔍 Looking for league table patterns in HTML...");
    
    // Look for actual league table data in a more precise way
    console.log("🔍 Looking for precise league table data...");
    
    // First, try to find the actual league table by looking for specific content
    const leagueTableRegex = /<table[^>]*>[\s\S]*?(?:POS|Position|Pos)[\s\S]*?<\/table>/gi;
    const leagueTables = html.match(leagueTableRegex);
    
    if (leagueTables && leagueTables.length > 0) {
      console.log(`📊 Found ${leagueTables.length} potential league tables`);
      
      for (let table of leagueTables) {
        // Extract rows from this table
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        const rows = table.match(rowRegex);
        
        if (rows && rows.length > 1) {
          console.log(`📊 Found ${rows.length} rows in league table`);
          
          const tableData = rows.map(row => {
            // Extract cells more carefully
            const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            const cells = row.match(cellRegex);
            
            if (!cells) return [];
            
            const rowData = cells.map(cell => {
              // Remove HTML tags and get text content
              let text = cell.replace(/<[^>]*>/g, '').trim();
              // Clean up extra whitespace
              text = text.replace(/\s+/g, ' ').trim();
              return text;
            }).filter(cell => cell.length > 0); // Only keep non-empty cells
            
            return rowData;
          }).filter(row => row.length >= 5); // Only keep rows with at least 5 columns
          
          if (tableData.length > 1) {
            console.log(`📊 Found ${tableData.length} meaningful rows in league table`);
            return tableData;
          }
        }
      }
    }

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

    // Filter for league table data only - be very strict about what constitutes league data
    const filteredData = tableData.filter(row => {
      // Must have at least 5 columns
      if (row.length < 5) return false;

      // Must not contain loading messages, HTML attributes, or other non-league content
      if (row.some(cell => 
        cell.includes('Data loading') || 
        cell.includes('click here') || 
        cell.includes('var lrcode') ||
        cell.includes('div') ||
        cell.includes('id=') ||
        cell.includes('style=') ||
        cell.includes('class=') ||
        cell.includes('width=') ||
        cell.includes('align=') ||
        cell.includes('overflow') ||
        cell.includes('hidden') ||
        cell.includes('wcustomhtml') ||
        cell.includes('lrep') ||
        cell.includes('href=') ||
        cell.includes('https://') ||
        cell.includes('http://') ||
        cell.includes('thefa.com') ||
        cell.includes('FULL-TIME') ||
        cell.includes('FULL TIME') ||
        cell.match(/^\d{10,}$/) || // Very long numbers (likely IDs)
        cell.match(/^[a-z]+$/) && cell.length > 10 // Long lowercase words (likely HTML attributes)
      )) {
        return false;
      }

      // Check if this looks like a league table row by looking for common patterns
      const rowText = row.join(' ').toLowerCase();

      // Header row detection
      if (rowText.includes('pos') && rowText.includes('pts') && rowText.includes('w') && rowText.includes('d') && rowText.includes('l')) {
        return true; // This is likely a header row
      }

      // Data row detection - must have specific league table characteristics
      const hasPosition = row.some(cell => {
        const num = parseInt(cell);
        return !isNaN(num) && num >= 1 && num <= 20; // Position should be 1-20
      });

      const hasTeamName = row.some(cell => {
        return cell.length > 3 && 
               !cell.match(/^\d+$/) && 
               !cell.match(/^[A-Z]$/) &&
               !cell.includes('div') &&
               !cell.includes('id') &&
               !cell.includes('style') &&
               !cell.includes('class') &&
               !cell.includes('width') &&
               !cell.includes('align') &&
               !cell.includes('overflow') &&
               !cell.includes('hidden') &&
               !cell.includes('wcustomhtml') &&
               !cell.includes('lrep') &&
               !cell.includes('href') &&
               !cell.includes('https') &&
               !cell.includes('http') &&
               !cell.includes('thefa') &&
               !cell.includes('FULL') &&
               !cell.match(/^\d{10,}$/);
      });

      const hasNumericStats = row.some(cell => {
        const num = parseInt(cell);
        return !isNaN(num) && num >= 0 && num <= 100; // Reasonable range for league stats
      });

      // Must have position, team name, and numeric stats
      return hasPosition && hasTeamName && hasNumericStats;
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
