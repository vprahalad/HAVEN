# Installing Node.js for HAVEN

The HAVEN frontend requires Node.js to run. If you're seeing "No package manager found" errors, you need to install Node.js first.

## Quick Install Options

### Option 1: Download from Node.js Website (Recommended)
1. Visit https://nodejs.org/
2. Download the **LTS (Long Term Support)** version
3. Run the installer
4. Restart your terminal
5. Verify installation: `node --version` and `npm --version`

### Option 2: Install via Homebrew (Mac)
```bash
brew install node
```

### Option 3: Install via NVM (Node Version Manager)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.bashrc  # or ~/.zshrc

# Install Node.js LTS
nvm install --lts
nvm use --lts
```

### Option 4: Install via Conda (if you use Anaconda/Miniconda)
```bash
conda install nodejs npm
```

## Verify Installation

After installing, verify Node.js is working:
```bash
node --version
npm --version
```

You should see version numbers for both commands.

## After Installation

Once Node.js is installed, run:
```bash
python run_unified.py
```

This will:
1. Install Next.js dependencies
2. Start both Flask backend and Next.js frontend
3. Make everything available at http://localhost:3000

## Troubleshooting

### "Command not found" after installation
- Restart your terminal
- Check that Node.js is in your PATH: `echo $PATH`
- For nvm: Make sure you've run `source ~/.bashrc` or `source ~/.zshrc`

### Still can't find npm
- Try: `which node` and `which npm`
- If they're not found, you may need to add Node.js to your PATH manually
- Check installation location: Usually `/usr/local/bin` or `~/.nvm/versions/node/*/bin`

### Permission errors
- Don't use `sudo` with npm
- If you see permission errors, fix npm permissions: `mkdir ~/.npm-global && npm config set prefix '~/.npm-global'`


