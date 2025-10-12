# Dorkinians Table Scraper

Automatically scrapes the Southern Amateur League South Division 10 table and uploads it to Google Sheets.

## Features

- Scrapes league table data from the official website
- Uploads data to Google Sheets with proper number formatting
- Runs daily via GitHub Actions
- Secure credential management

## Setup

### 1. Google Sheets API Setup

1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create a Service Account
4. Download the JSON credentials
5. Share your Google Sheet with the service account email

### 2. GitHub Actions Setup

1. Push this code to a GitHub repository
2. Go to Settings → Secrets and variables → Actions
3. Add these secrets:
   - `GOOGLE_CLIENT_EMAIL`: Your service account email
   - `GOOGLE_PRIVATE_KEY`: Your service account private key
   - `SHEET_ID`: Your Google Sheet ID

### 3. Local Development

```bash
# Install dependencies
npm install

# Create .env file with your credentials
GOOGLE_CLIENT_EMAIL=your-service-account@email.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SHEET_ID=your-sheet-id

# Run scraper
npm run scrape
```

## Usage

- **Manual run**: `npm run scrape`
- **Web server**: `npm start` (runs on port 3000)
- **Daily automation**: GitHub Actions runs at 9:00 AM UTC daily

## Files

- `scrape-and-upload.js` - Main scraper logic
- `github-actions-runner.js` - GitHub Actions runner
- `index.js` - Express web server
- `.github/workflows/scraper.yml` - GitHub Actions workflow
