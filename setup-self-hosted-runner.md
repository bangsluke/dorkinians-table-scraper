# Self-Hosted Runner Setup Guide

## Why Self-Hosted Runner?

The FA website blocks GitHub Actions IP ranges, but allows your home IP address. A self-hosted runner runs on your local machine using your IP address.

## Setup Steps

### 1. Create Self-Hosted Runner

1. Go to your repository on GitHub
2. Click **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**
4. Choose **Linux** (or Windows if you prefer)
5. Follow the setup instructions

### 2. Download and Configure

#### Option A: Linux (Recommended for servers)

```bash
# Create a folder for the runner
mkdir actions-runner && cd actions-runner

# Download the runner package (replace with your token)
curl -o actions-runner-linux-x64-2.328.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-linux-x64-2.328.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64-2.328.0.tar.gz

# Configure (use token from GitHub)
./config.sh --url https://github.com/bangsluke/dorkinians-table-scraper --token YOUR_TOKEN

# Install as a service (optional)
sudo ./svc.sh install
sudo ./svc.sh start
```

#### Option B: Windows (For your local machine)

```powershell
# Run the automated setup script
.\setup-runner-windows.ps1

# Or manually:
# 1. Download actions-runner-win-x64-2.328.0.zip
# 2. Extract to actions-runner folder
# 3. Run: .\config.cmd --url [URL] --token [TOKEN]
# 4. Run: .\run.cmd to start the runner
```

### 4. Test the Runner

1. The runner will appear in GitHub under **Settings** → **Actions** → **Runners**
2. It should show as "Online" with a green dot
3. The workflow will automatically use the self-hosted runner

## Benefits

- ✅ **Uses your IP address** - bypasses FA website blocking
- ✅ **Runs locally** - no GitHub Actions IP restrictions
- ✅ **Same as local testing** - should work exactly like your local runs
- ✅ **Scheduled daily** - runs at 6:00 AM UK time

## Security Notes

- The runner has access to your repository secrets
- Only run on trusted machines
- Consider using a dedicated machine for this purpose

## Troubleshooting

- If the runner goes offline, restart the service
- Check logs in the runner folder
- Ensure your machine stays on and connected to internet
