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
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    this.currentUserAgentIndex = 0;
  }

  getCurrentUserAgent() {
    return this.userAgents[this.currentUserAgentIndex];
  }

  rotateUserAgent() {
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;
  }

  /**
   * Fetch HTML content from URL with retry logic
   * @param {string} url - URL to fetch
   * @param {number} retries - Number of retry attempts
   * @returns {Promise<string>} HTML content
   */
  async fetchHTML(url, retries = 5) {
    console.log(`🌐 Starting fetch process for: ${url}`);
    console.log(`🔧 Environment: GitHub Actions=${process.env.GITHUB_ACTIONS === 'true'}, Node=${process.version}, Platform=${process.platform}`);
    console.log(`🔧 Available memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used, ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB total`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔍 Attempt ${attempt}/${retries} - Fetching: ${url}`);
        console.log(`🌐 Using User-Agent: ${this.getCurrentUserAgent().substring(0, 50)}...`);
        
        const startTime = Date.now();
        const html = await this._fetchHTMLSingle(url);
        const duration = Date.now() - startTime;
        
        console.log(`✅ Successfully fetched HTML (${html.length} characters) in ${duration}ms`);
        console.log(`📊 Response analysis: ${this._analyzeResponse(html)}`);
        return html;
        
      } catch (error) {
        console.log(`⚠️ Attempt ${attempt} failed: ${error.message}`);
        console.log(`🔍 Error details: code=${error.code}, syscall=${error.syscall}, address=${error.address}, port=${error.port}`);
        
        if (error.code === 'ETIMEDOUT') {
          console.log(`⏰ Timeout detected - this is the primary issue in GitHub Actions`);
        } else if (error.code === 'ECONNREFUSED') {
          console.log(`🚫 Connection refused - possible firewall or DNS issue`);
        } else if (error.code === 'ENOTFOUND') {
          console.log(`🔍 DNS resolution failed - possible DNS issue`);
        }
        
        if (attempt === retries) {
          // If we're in GitHub Actions and all attempts failed, try alternative approach
          if (process.env.GITHUB_ACTIONS === 'true') {
            console.log('🔄 Trying alternative fetch method for GitHub Actions...');
            try {
              const startTime = Date.now();
              const html = await this._fetchHTMLAlternative(url);
              const duration = Date.now() - startTime;
              console.log(`✅ Alternative method succeeded (${html.length} characters) in ${duration}ms`);
              return html;
            } catch (altError) {
              console.log(`❌ Alternative method also failed: ${altError.message}`);
              console.log(`🔍 Alternative error details: code=${altError.code}, syscall=${altError.syscall}`);
            }
          }
          
          throw new Error(`Failed to fetch after ${retries} attempts. Last error: ${error.message}`);
        }
        
        // Rotate User-Agent for next attempt
        this.rotateUserAgent();
        
        // Wait before retry (exponential backoff with jitter)
        const baseWaitTime = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000; // Add random jitter
        const waitTime = baseWaitTime + jitter;
        console.log(`⏳ Waiting ${Math.round(waitTime)}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  _analyzeResponse(html) {
    const analysis = [];
    if (html.includes('Southern Amateur Football League')) analysis.push('League content found');
    if (html.includes('table')) analysis.push('Table elements present');
    if (html.includes('standings')) analysis.push('Standings content found');
    if (html.length < 1000) analysis.push('Very short response - possible error page');
    if (html.includes('error') || html.includes('Error')) analysis.push('Error content detected');
    if (html.includes('timeout') || html.includes('Timeout')) analysis.push('Timeout message detected');
    return analysis.length > 0 ? analysis.join(', ') : 'No specific content patterns detected';
  }

  /**
   * Alternative fetch method for GitHub Actions using proxy
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} HTML content
   */
  async _fetchHTMLAlternative(url) {
    console.log(`🔄 Starting alternative fetch methods for GitHub Actions`);
    console.log(`🔧 Target URL: ${url}`);
    
    // Try multiple proxy services
    const proxies = [
      null, // Direct connection first
      'https://cors-anywhere.herokuapp.com/',
      'https://api.allorigins.win/raw?url=',
      'https://thingproxy.freeboard.io/fetch/'
    ];
    
    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i];
      try {
        console.log(`🔄 Trying method ${i + 1}/${proxies.length}: ${proxy || 'Direct connection'}`);
        const targetUrl = proxy ? proxy + encodeURIComponent(url) : url;
        console.log(`🔗 Target URL: ${targetUrl}`);
        
        const startTime = Date.now();
        const result = await this._fetchWithProxy(targetUrl, proxy);
        const duration = Date.now() - startTime;
        
        console.log(`✅ Success with method ${i + 1} (${proxy || 'Direct'}): ${result.length} chars in ${duration}ms`);
        console.log(`📊 Response analysis: ${this._analyzeResponse(result)}`);
        return result;
      } catch (error) {
        console.log(`❌ Method ${i + 1} failed (${proxy || 'Direct'}): ${error.message}`);
        console.log(`🔍 Method error details: code=${error.code}, syscall=${error.syscall}`);
        
        if (i === proxies.length - 1) {
          console.log(`💥 All alternative methods failed`);
          throw error; // Re-throw if all proxies failed
        }
      }
    }
  }

  /**
   * Fetch with specific proxy
   * @param {string} targetUrl - URL to fetch (may include proxy)
   * @param {string|null} proxy - Proxy service used
   * @returns {Promise<string>} HTML content
   */
  async _fetchWithProxy(targetUrl, proxy) {
    return new Promise((resolve, reject) => {
      const protocol = targetUrl.startsWith('https:') ? https : http;
      
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Connection': 'close'
        },
        timeout: 15000,
        agent: false,
        family: 4
      };
      
      const req = protocol.get(targetUrl, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve(data);
        });
        
        res.on('error', (error) => {
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
   * Single fetch attempt
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} HTML content
   */
  async _fetchHTMLSingle(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;
      
      // Detect if running in GitHub Actions
      const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
      
      const options = {
        headers: {
          'User-Agent': this.getCurrentUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': isGitHubActions ? 'close' : 'keep-alive', // Use close for GitHub Actions
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: isGitHubActions ? 15000 : 30000, // Shorter timeout for GitHub Actions
        // Add additional options for GitHub Actions
        ...(isGitHubActions && {
          agent: false, // Disable connection pooling
          family: 4, // Force IPv4
          lookup: undefined // Use default DNS
        })
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
      
      req.setTimeout(options.timeout, () => {
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
      
      // Add delay to allow dynamic content to load
      console.log('⏳ Waiting for dynamic content to load...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const dom = new JSDOM(html, {
        runScripts: "dangerously",
        resources: "usable"
      });
      const document = dom.window.document;
      
      // Debug: Log page title and basic structure
      const title = document.querySelector('title')?.textContent || 'No title';
      console.log(`📄 Page title: ${title}`);
      console.log(`📄 Page length: ${html.length} characters`);
      
      const tableRows = [];
      
      // Find the league table - try multiple selectors with better targeting
      const tables = document.querySelectorAll('table');
      console.log(`🔍 Found ${tables.length} tables on page`);
      
      let table = null;
      
      // Try to find the standings table with more specific selectors
      const possibleSelectors = [
        'table.standings-table',
        'table.table',
        '.standings table',
        'table[class*="standings"]',
        'table[class*="league"]',
        'table[class*="table"]',
        'table[class*="results"]'
      ];
      
      for (const selector of possibleSelectors) {
        table = document.querySelector(selector);
        if (table) {
          console.log(`📊 Found table using selector: ${selector}`);
          break;
        }
      }
      
      // If no specific table found, try by table number
      if (!table && tables[tableNumber - 1]) {
        table = tables[tableNumber - 1];
        console.log(`📊 Using table ${tableNumber} (${tables.length} total tables)`);
      } else if (!table && tables.length > 0) {
        // Find the largest table (likely the main content)
        let largestTable = tables[0];
        let maxRows = 0;
        
        tables.forEach((t, index) => {
          const rowCount = t.querySelectorAll('tr').length;
          if (rowCount > maxRows) {
            maxRows = rowCount;
            largestTable = t;
          }
        });
        
        table = largestTable;
        console.log(`📊 Using largest table with ${maxRows} rows`);
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
  console.log(`🔧 Environment: GitHub Actions=${process.env.GITHUB_ACTIONS === 'true'}, Node=${process.version}`);
  
  const scraper = new WebScrapingService();
  const season = "2024-25";
  const team = "Dorkinians";
  const url = "https://fulltime.thefa.com/index.html?divisionseason=311980811";
  
  console.log(`🔧 Scraper initialized with ${scraper.userAgents.length} User-Agent options`);
  console.log(`🔧 Target: ${season} season, ${team} team, Table 1`);
  
  try {
    console.log(`🔍 Scraping: ${url}`);
    const startTime = Date.now();
    const result = await scraper.scrapeFALeagueTable(url, season, team, 1);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️ Scraping completed in ${duration}ms`);
    console.log(`📊 Raw result type: ${typeof result}, has STANDINGS: ${result && result.STANDINGS ? 'Yes' : 'No'}`);
    
    if (result && result.STANDINGS) {
      const standings = JSON.parse(result.STANDINGS);
      console.log(`📊 Found ${standings.length} teams in league table`);
      console.log(`📊 First team: ${standings[0] ? standings[0].team || 'Unknown' : 'None'}`);
      return standings;
    } else {
      console.log("❌ No league table data found");
      console.log(`🔍 Result structure: ${JSON.stringify(Object.keys(result || {}))}`);
      return [];
    }
  } catch (error) {
    console.error("❌ Scraping failed:", error.message);
    console.error(`🔍 Scraping error details: code=${error.code}, syscall=${error.syscall}`);
    throw error;
  }
}

async function uploadToSheet(tableData) {
  console.log("📤 Uploading to Google Sheets...");
  console.log(`🔧 Data to upload: ${tableData.length} rows`);
  console.log(`🔧 Sheet ID: ${process.env.SHEET_ID ? 'Set' : 'Missing'}`);
  console.log(`🔧 Client Email: ${process.env.GOOGLE_CLIENT_EMAIL ? 'Set' : 'Missing'}`);
  console.log(`🔧 Private Key: ${process.env.GOOGLE_PRIVATE_KEY ? 'Set' : 'Missing'}`);
  
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.SHEET_ID) {
    throw new Error("Missing required environment variables");
  }

  // Use service account credentials with JWT
  console.log(`🔐 Initializing Google Sheets authentication...`);
  const auth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // Get access token
  console.log(`🔐 Requesting access token...`);
  const startAuthTime = Date.now();
  const accessToken = await auth.getAccessToken();
  const authDuration = Date.now() - startAuthTime;
  console.log(`✅ Authentication successful in ${authDuration}ms`);
  console.log(`🔐 Token type: ${accessToken.token_type}, expires: ${accessToken.expiry_date}`);
  
  // Prepare data
  console.log(`📊 Preparing data for upload...`);
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
  console.log(`📊 Prepared ${values.length} rows (${values[0].length} columns each)`);
  console.log(`📊 Sample data: ${JSON.stringify(values[1] || 'No data')}`);

  // Clear existing data and add new data
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SHEET_ID}/values/'Dorkinians%20Data'!D:Z?access_token=${accessToken.token}`;
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SHEET_ID}/values/'Dorkinians%20Data'!D1?valueInputOption=USER_ENTERED&access_token=${accessToken.token}`;
  
  console.log(`🔗 Clear URL: ${clearUrl.substring(0, 100)}...`);
  console.log(`🔗 Update URL: ${updateUrl.substring(0, 100)}...`);

  // Clear the sheet
  console.log(`🗑️ Clearing existing data from sheet...`);
  const startClearTime = Date.now();
  const clearResponse = await fetch(clearUrl, { method: 'DELETE' });
  const clearDuration = Date.now() - startClearTime;
  console.log(`✅ Clear operation completed in ${clearDuration}ms (status: ${clearResponse.status})`);
  
  // Add new data
  console.log(`📤 Uploading new data to sheet...`);
  const startUpdateTime = Date.now();
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: values
    })
  });
  const updateDuration = Date.now() - startUpdateTime;
  console.log(`✅ Update operation completed in ${updateDuration}ms (status: ${response.status})`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Google Sheets API error: ${response.status} ${response.statusText}`);
    console.error(`❌ Error details: ${errorText}`);
    throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
  }

  console.log(`✅ Uploaded ${tableData.length} rows to Google Sheets`);
}

async function runScraper() {
  const overallStartTime = Date.now();
  console.log("🚀 Starting scraper...");
  console.log(`🔧 Process ID: ${process.pid}`);
  console.log(`🔧 Working directory: ${process.cwd()}`);
  console.log(`🔧 Environment variables: ${Object.keys(process.env).length} set`);
  
  try {
    console.log("📊 Phase 1: Scraping data...");
    const scrapeStartTime = Date.now();
    const tableData = await scrapeTable();
    const scrapeDuration = Date.now() - scrapeStartTime;
    console.log(`✅ Scraping phase completed in ${scrapeDuration}ms`);
    
    if (tableData.length === 0) {
      console.log("❌ No data to upload");
      return;
    }
    
    console.log("📤 Phase 2: Uploading to Google Sheets...");
    const uploadStartTime = Date.now();
    await uploadToSheet(tableData);
    const uploadDuration = Date.now() - uploadStartTime;
    console.log(`✅ Upload phase completed in ${uploadDuration}ms`);
    
    const totalDuration = Date.now() - overallStartTime;
    console.log(`✅ Scraper completed successfully in ${totalDuration}ms total!`);
    
  } catch (error) {
    const totalDuration = Date.now() - overallStartTime;
    console.error(`❌ Scraper failed after ${totalDuration}ms:`, error.message);
    
    // Log additional error details for debugging
    console.error(`🔍 Error type: ${error.constructor.name}`);
    if (error.code) {
      console.error(`🔍 Error code: ${error.code}`);
    }
    if (error.syscall) {
      console.error(`🔍 System call: ${error.syscall}`);
    }
    if (error.address) {
      console.error(`🔍 Address: ${error.address}:${error.port || 'unknown'}`);
    }
    if (error.stack) {
      console.error(`🔍 Stack trace: ${error.stack}`);
    }
    
    throw error;
  } finally {
    // Clean up any remaining connections
    console.log(`🧹 Cleaning up resources...`);
    if (global.gc) {
      global.gc();
      console.log(`🧹 Garbage collection triggered`);
    }
    console.log(`🧹 Cleanup completed`);
  }
}

module.exports = runScraper;

// Allow direct execution
if (require.main === module) {
  runScraper().catch(console.error);
}