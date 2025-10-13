// scrape-and-upload.js
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const { JSDOM } = require('jsdom');
const { JWT } = require('google-auth-library');

// Load environment variables
require('dotenv').config();

class WebScrapingService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  /**
   * Fetch HTML content from URL with retry logic
   * @param {string} url - URL to fetch
   * @param {number} retries - Number of retry attempts
   * @returns {Promise<string>} HTML content
   */
  async fetchHTML(url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔍 Attempt ${attempt}/${retries} - Fetching: ${url}`);
        
        const html = await this._fetchHTMLSingle(url);
        console.log(`✅ Successfully fetched HTML (${html.length} characters)`);
        return html;
        
      } catch (error) {
        console.log(`⚠️ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === retries) {
          throw new Error(`Failed to fetch after ${retries} attempts. Last error: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Single fetch attempt
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} HTML content
   */
  async _fetchHTMLSingle(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;
      
      const options = {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        timeout: 15000 // Reduced timeout for faster retries
      };
      
      const req = protocol.get(url, options, (res) => {
        let data = '';
        let stream = res;
        
        // Handle gzipped content
        if (res.headers['content-encoding'] === 'gzip') {
          stream = res.pipe(zlib.createGunzip());
        } else if (res.headers['content-encoding'] === 'deflate') {
          stream = res.pipe(zlib.createInflate());
        } else if (res.headers['content-encoding'] === 'br') {
          stream = res.pipe(zlib.createBrotliDecompress());
        }
        
        stream.on('data', (chunk) => {
          data += chunk;
        });
        
        stream.on('end', () => {
          resolve(data);
        });
        
        stream.on('error', (error) => {
          reject(error);
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Extract text content from DOM element
   * @param {Element} element - DOM element
   * @returns {string} Text content
   */
  extractText(element) {
    if (!element) return '';
    return element.textContent?.trim() || '';
  }

  /**
   * Extract number from DOM element
   * @param {Element} element - DOM element
   * @returns {number|null} Extracted number or null
   */
  extractNumber(element) {
    if (!element) return null;
    const text = this.extractText(element);
    const number = parseInt(text.replace(/[^\d-]/g, ''));
    return isNaN(number) ? null : number;
  }

  /**
   * Scrape FA Full Time league table
   * @param {string} url - FA Full Time table URL
   * @param {string} season - Season identifier
   * @param {string} team - Team identifier
   * @param {number} tableNumber - HTML table number to target
   * @returns {Promise<Array>} Array of league table rows
   */
  async scrapeFALeagueTable(url, season, team, tableNumber = 1) {
    try {
      console.log(`🔍 Scraping FA league table: ${url}`);
      
      const html = await this.fetchHTML(url);
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Debug: Log page title and basic structure
      const title = document.querySelector('title')?.textContent || 'No title';
      console.log(`📄 Page title: ${title}`);
      console.log(`📄 Page length: ${html.length} characters`);
      
      const tableRows = [];
      
      // Find the league table - try multiple selectors
      const tables = document.querySelectorAll('table');
      console.log(`🔍 Found ${tables.length} tables on page`);
      
      let table = null;
      
      // Try specific table number first
      if (tables[tableNumber - 1]) {
        table = tables[tableNumber - 1];
        console.log(`📊 Using table ${tableNumber} (${tables.length} total tables)`);
      } else {
        // Try common selectors
        table = document.querySelector('table.standings-table, table.table, .standings table, table[class*="standings"], table[class*="league"]');
        if (!table && tables.length > 0) {
          table = tables[0]; // Use first table as fallback
          console.log('📊 Using first table as fallback');
        }
      }
      
      if (!table) {
        console.warn('⚠️ No league table found on FA Full Time page');
        console.log('🔍 Available tables:', tables.length);
        return [];
      }
      
      console.log(`📊 Using table with ${table.querySelectorAll('tr').length} rows`);
      
      const rows = table.querySelectorAll('tbody tr, tr');
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td, th');
        
        if (cells.length >= 9) { // Minimum columns for league table
          const teamName = this.extractText(cells[1]) || this.extractText(cells[0]);
          const position = this.extractNumber(cells[0]) || index + 1;
          const played = this.extractNumber(cells[2]) || 0;
          const won = this.extractNumber(cells[3]) || 0;
          const drawn = this.extractNumber(cells[4]) || 0;
          const lost = this.extractNumber(cells[5]) || 0;
          const forGoals = this.extractNumber(cells[6]) || 0;
          const againstGoals = this.extractNumber(cells[7]) || 0;
          const goalDiff = this.extractNumber(cells[8]) || 0;
          const points = this.extractNumber(cells[9]) || 0;
          
          if (teamName && teamName.trim() !== '' && teamName.trim() !== 'Team') {
            tableRows.push({
              position: parseInt(position),
              team: teamName.trim(),
              played: parseInt(played),
              won: parseInt(won),
              drawn: parseInt(drawn),
              lost: parseInt(lost),
              for: parseInt(forGoals),
              against: parseInt(againstGoals),
              goalDiff: parseInt(goalDiff),
              points: parseInt(points)
            });
          }
        }
      });
      
      console.log(`✅ Scraped ${tableRows.length} league table rows from FA Full Time`);
      
      // Return single league table node instead of individual team rows
      if (tableRows.length > 0) {
        return {
          ID: `leaguetable_${season}_Premier_Division`,
          SEASON: season,
          LEAGUE_NAME: 'Premier Division',
          DIVISION: 'Premier',
          DATA_SOURCE: 'FA Full Time',
          DATA_SOURCE_URL: url,
          LAST_UPDATED: new Date().toISOString(),
          STANDINGS: JSON.stringify(tableRows), // Store as JSON string
          TOTAL_TEAMS: tableRows.length
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error scraping FA league table:', error);
      throw error;
    }
  }
}

async function scrapeTable() {
  console.log("🌐 Starting FA Full Time scraping...");
  
  const scraper = new WebScrapingService();
  const season = "2024-25";
  const team = "Dorkinians";
  
  // Primary URL
  const primaryUrl = "https://fulltime.thefa.com/index.html?divisionseason=311980811";
  
  // Fallback URLs (if primary fails)
  const fallbackUrls = [
    "https://fulltime.thefa.com/index.html?divisionseason=311980811",
    // Add more fallback URLs if needed
  ];
  
  const urls = [primaryUrl, ...fallbackUrls];
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      console.log(`🔍 Trying URL ${i + 1}/${urls.length}: ${url}`);
      const result = await scraper.scrapeFALeagueTable(url, season, team, 1);
      
      if (result && result.STANDINGS) {
        const standings = JSON.parse(result.STANDINGS);
        console.log(`📊 Found ${standings.length} teams in league table`);
        return standings;
      } else {
        console.log("❌ No league table data found in this URL");
        if (i < urls.length - 1) {
          console.log("🔄 Trying next URL...");
          continue;
        }
      }
    } catch (error) {
      console.error(`❌ URL ${i + 1} failed:`, error.message);
      if (i < urls.length - 1) {
        console.log("🔄 Trying next URL...");
        continue;
      } else {
        throw error;
      }
    }
  }
  
  console.log("❌ All URLs failed - no league table data found");
  return [];
}

async function uploadToSheet(tableData) {
  console.log("📤 Uploading to Google Sheets...");
  
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.SHEET_ID) {
    throw new Error("Missing required environment variables");
  }

  // Use service account credentials with JWT
  const auth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // Get access token
  const accessToken = await auth.getAccessToken();
  
  // Prepare data
  const values = [
    ['Position', 'Team', 'Played', 'Won', 'Drawn', 'Lost', 'For', 'Against', 'Goal Diff', 'Points'],
    ...tableData.map(row => [
      row.position,
      row.team,
      row.played,
      row.won,
      row.drawn,
      row.lost,
      row.for,
      row.against,
      row.goalDiff,
      row.points
    ])
  ];

  // Clear existing data and add new data
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SHEET_ID}/values/'Dorkinians%20Data'!D:Z?access_token=${accessToken.token}`;
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SHEET_ID}/values/'Dorkinians%20Data'!D1?valueInputOption=USER_ENTERED&access_token=${accessToken.token}`;

  // Clear the sheet
  await fetch(clearUrl, { method: 'DELETE' });
  
  // Add new data
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: values
    })
  });

  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
  }

  console.log(`✅ Uploaded ${tableData.length} rows to Google Sheets`);
}

async function runScraper() {
  try {
    console.log("🚀 Starting scraper...");
    
    const tableData = await scrapeTable();
    
    if (tableData.length === 0) {
      console.log("❌ No data to upload");
      return;
    }
    
    await uploadToSheet(tableData);
    console.log("✅ Scraper completed successfully!");
    
  } catch (error) {
    console.error("❌ Scraper failed:", error.message);
    
    // Log additional error details for debugging
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    if (error.syscall) {
      console.error(`System call: ${error.syscall}`);
    }
    if (error.address) {
      console.error(`Address: ${error.address}:${error.port || 'unknown'}`);
    }
    
    throw error;
  }
}

module.exports = runScraper;

// Allow direct execution
if (require.main === module) {
  runScraper().catch(console.error);
}