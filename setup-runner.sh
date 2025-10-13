#!/bin/bash

# Self-hosted runner setup script for Dorkinians Table Scraper
# This script helps set up a self-hosted GitHub Actions runner

echo "🚀 Setting up self-hosted runner for Dorkinians Table Scraper"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create runner directory
RUNNER_DIR="actions-runner"
if [ -d "$RUNNER_DIR" ]; then
    echo "⚠️  Runner directory already exists. Removing..."
    rm -rf "$RUNNER_DIR"
fi

mkdir "$RUNNER_DIR"
cd "$RUNNER_DIR"

echo "📥 Downloading GitHub Actions runner..."
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

echo "📦 Extracting runner package..."
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

echo "🔧 Runner package ready!"
echo ""
echo "Next steps:"
echo "1. Go to your GitHub repository"
echo "2. Click Settings → Actions → Runners"
echo "3. Click 'New self-hosted runner'"
echo "4. Copy the configuration command"
echo "5. Run: ./config.sh --url [URL] --token [TOKEN]"
echo "6. Run: ./run.sh to start the runner"
echo ""
echo "The runner will use your local IP address, bypassing the FA website blocking."
