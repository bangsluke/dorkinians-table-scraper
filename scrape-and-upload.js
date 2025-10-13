// scrape-and-upload.js
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const { JSDOM } = require('jsdom');
const puppeteer = require('puppeteer');
const { JWT } = require('google-auth-library');
const { google } = require('googleapis');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

class WebScrapingService {
  constructor() {
    // More realistic UK-based user agents to avoid detection
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
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
    
    // Add random delay before first request to appear more human-like
    if (process.env.GITHUB_ACTIONS === 'true') {
      const randomDelay = Math.random() * 5000 + 2000; // 2-7 seconds
      console.log(`⏳ Adding random delay of ${Math.round(randomDelay)}ms to appear more human-like...`);
      await new Promise(resolve => setTimeout(resolve, randomDelay));
    }
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔍 Attempt ${attempt}/${retries} - Fetching: ${url}`);
        console.log(`🌐 Using User-Agent: ${this.getCurrentUserAgent().substring(0, 50)}...`);
        
        const startTime = Date.now();
        const html = await this._fetchHTMLSingle(url);
        const duration = Date.now() - startTime;
        
        console.log(`✅ Successfully fetched HTML (${html.length} characters) in ${duration}ms`);
        console.log(`📊 Response analysis: ${this._analyzeResponse(html)}`);
        
        // Log HTML content for debugging in GitHub Actions
        if (process.env.GITHUB_ACTIONS === 'true') {
          console.log(`📄 HTML Content (first 500 chars): ${html.substring(0, 500)}`);
          if (html.length < 1000) {
            console.log(`📄 Full HTML Content: ${html}`);
          }
        }
        
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
          // If we're in GitHub Actions and all attempts failed, try alternative approaches
          if (process.env.GITHUB_ACTIONS === 'true') {
            console.log('🔄 Trying headless browser method for GitHub Actions...');
            try {
              const html = await this._fetchHTMLWithBrowser(url);
              console.log(`✅ Headless browser method succeeded (${html.length} characters)`);
              return html;
            } catch (browserError) {
              console.log(`❌ Headless browser method failed: ${browserError.message}`);
              console.log(`🔄 Trying proxy methods as fallback...`);
              
              try {
                const startTime = Date.now();
                const html = await this._fetchHTMLAlternative(url);
                const duration = Date.now() - startTime;
                console.log(`✅ Proxy method succeeded (${html.length} characters) in ${duration}ms`);
                return html;
              } catch (altError) {
                console.log(`❌ All alternative methods failed: ${altError.message}`);
                console.log(`🔍 Alternative error details: code=${altError.code}, syscall=${altError.syscall}`);
              }
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
   * Headless browser fetch method for GitHub Actions
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} HTML content
   */
  async _fetchHTMLWithBrowser(url) {
    console.log(`🌐 Starting headless browser fetch for: ${url}`);
    
    let browser;
    try {
      console.log(`🚀 Launching headless browser...`);
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set user agent
      await page.setUserAgent(this.getCurrentUserAgent());
      
      // Set viewport to common resolution
      await page.setViewport({ width: 1366, height: 768 });
      
      // Set extra headers to appear more human-like
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1'
      });
      
      console.log(`📄 Navigating to: ${url}`);
      const startTime = Date.now();
      
      // Navigate to page and wait for network to be idle
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 60000 // 60 second timeout
      });
      
      // Wait additional time for dynamic content with human-like behavior
      console.log(`⏳ Waiting for dynamic content to load...`);
      await page.waitForTimeout(7000); // Wait 7 seconds as you mentioned
      
      // Simulate human-like behavior - scroll a bit
      await page.evaluate(() => {
        window.scrollTo(0, 100);
      });
      await page.waitForTimeout(1000);
      
      // Scroll back up
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1000);
      
      // Get the page content
      const html = await page.content();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Browser fetch completed in ${duration}ms (${html.length} characters)`);
      console.log(`📊 Response analysis: ${this._analyzeResponse(html)}`);
      
      // Log HTML content for debugging in GitHub Actions
      if (process.env.GITHUB_ACTIONS === 'true') {
        console.log(`📄 HTML Content (first 500 chars): ${html.substring(0, 500)}`);
        if (html.length < 1000) {
          console.log(`📄 Full HTML Content: ${html}`);
        }
      }
      
      return html;
      
    } catch (error) {
      console.log(`❌ Browser fetch failed: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        console.log(`🧹 Closing browser...`);
        await browser.close();
      }
    }
  }

  /**
   * Alternative fetch method for GitHub Actions using proxy
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} HTML content
   */
  async _fetchHTMLAlternative(url) {
    console.log(`🔄 Starting alternative fetch methods for GitHub Actions`);
    console.log(`🔧 Target URL: ${url}`);
    
    // Try multiple proxy services and alternative approaches
    const proxies = [
      null, // Direct connection first
      'https://api.allorigins.win/raw?url=',
      'https://thingproxy.freeboard.io/fetch/',
      'https://cors-anywhere.herokuapp.com/',
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://corsproxy.io/?'
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
        
        // Log HTML content for debugging in GitHub Actions
        if (process.env.GITHUB_ACTIONS === 'true') {
          console.log(`📄 HTML Content (first 500 chars): ${result.substring(0, 500)}`);
          if (result.length < 1000) {
            console.log(`📄 Full HTML Content: ${result}`);
          }
        }
        
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
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': isGitHubActions ? 'close' : 'keep-alive',
          'Cache-Control': 'max-age=0',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'DNT': '1'
        },
        timeout: isGitHubActions ? 30000 : 30000, // Longer timeout for GitHub Actions
        // Add additional options for GitHub Actions
        ...(isGitHubActions && {
          agent: false, // Disable connection pooling
          family: 4, // Force IPv4
          lookup: undefined, // Use default DNS
          keepAlive: false, // Disable keep-alive
          keepAliveMsecs: 0 // Disable keep-alive timing
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
        console.log(`⏰ Request timeout after ${options.timeout}ms for ${url}`);
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

  // Use service account credentials with googleapis library
  console.log(`🔐 Initializing Google Sheets authentication...`);
  
  // Fix private key format for Node.js OpenSSL compatibility
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (privateKey) {
    // Replace escaped newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // Remove any existing headers and ensure clean format
    privateKey = privateKey.replace(/-----BEGIN.*?-----\n?/g, '');
    privateKey = privateKey.replace(/-----END.*?-----\n?/g, '');
    privateKey = privateKey.replace(/\n/g, '');
    
    // Re-add proper headers with correct line breaks
    const lines = [];
    for (let i = 0; i < privateKey.length; i += 64) {
      lines.push(privateKey.substring(i, i + 64));
    }
    privateKey = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
    
    console.log(`🔐 Reformatted private key (${privateKey.length} chars)`);
  }
  
  console.log(`🔐 Private key format check: ${privateKey ? 'Present' : 'Missing'}`);
  console.log(`🔐 Key starts with: ${privateKey ? privateKey.substring(0, 30) + '...' : 'N/A'}`);
  
  // Try a completely different approach - use raw fetch with manual JWT
  console.log(`🔐 Attempting manual JWT authentication to bypass OpenSSL issues...`);
  
  const startAuthTime = Date.now();
  let accessToken;
  try {
    // Create JWT manually to avoid OpenSSL issues
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    
    const payload = {
      iss: process.env.GOOGLE_CLIENT_EMAIL,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };
    
    // Create JWT manually
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    // Use Node.js crypto module instead of the problematic libraries
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    
    // Clean the private key for crypto module
    const cleanPrivateKey = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\n/g, '');
    
    const keyBuffer = Buffer.from(cleanPrivateKey, 'base64');
    const signature = sign.sign(keyBuffer, 'base64url');
    
    const jwt = `${signatureInput}.${signature}`;
    
    console.log(`🔐 JWT created successfully (${jwt.length} chars)`);
    
    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error} - ${tokenData.error_description}`);
    }
    
    accessToken = {
      token: tokenData.access_token,
      token_type: tokenData.token_type,
      expiry_date: Date.now() + (tokenData.expires_in * 1000)
    };
    
    console.log(`✅ Manual JWT authentication successful`);
    
  } catch (manualError) {
    console.log(`⚠️  Manual JWT failed, trying googleapis library...`);
    console.log(`🔍 Manual Error: ${manualError.message}`);
    
    // Fallback to googleapis
    let auth;
    try {
      auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        privateKey,
        ['https://www.googleapis.com/auth/spreadsheets']
      );
      accessToken = await auth.getAccessToken();
    } catch (fallbackError) {
      console.log(`⚠️  All authentication methods failed`);
      throw new Error(`Authentication failed: ${fallbackError.message}`);
    }
  }

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