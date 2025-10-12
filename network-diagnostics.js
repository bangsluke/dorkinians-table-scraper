// network-diagnostics.js - Test network connectivity from GitHub Actions
const https = require('https');
const http = require('http');

async function testNetworkConnectivity() {
  console.log("🔍 Running network diagnostics...");
  
  const tests = [
    {
      name: "Google DNS",
      url: "https://8.8.8.8",
      timeout: 5000
    },
    {
      name: "Cloudflare DNS", 
      url: "https://1.1.1.1",
      timeout: 5000
    },
    {
      name: "Target Website",
      url: "https://www.southernamateurleague.co.uk",
      timeout: 10000
    },
    {
      name: "Target Page",
      url: "https://www.southernamateurleague.co.uk/south-division-10.html",
      timeout: 15000
    }
  ];

  for (const test of tests) {
    try {
      console.log(`🧪 Testing ${test.name}...`);
      const result = await testUrl(test.url, test.timeout);
      console.log(`✅ ${test.name}: ${result.status} (${result.time}ms)`);
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
}

function testUrl(url, timeout) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, { timeout }, (res) => {
      const endTime = Date.now();
      resolve({
        status: res.statusCode,
        time: endTime - startTime
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout after ${timeout}ms`));
    });
  });
}

module.exports = { testNetworkConnectivity };
