#!/bin/bash

# ============================================================================
# SSH Key Setup Script for GitHub Actions Deployment
# ============================================================================
# This script sets up SSH key authentication for the cryptotrader user
# Run this on your VM to fix SSH authentication issues
# ============================================================================

set -e

echo "========================================="
echo "SSH Key Setup for GitHub Actions"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "⚠️  Please do not run as root. Run as your regular user with sudo access."
    exit 1
fi

# Create cryptotrader user if it doesn't exist
if ! id cryptotrader &>/dev/null; then
    echo "👤 Creating cryptotrader user..."
    sudo useradd -m -s /bin/bash cryptotrader
    echo "✅ User created"
else
    echo "✅ User cryptotrader already exists"
fi

# Create directories
echo "📁 Creating deployment directories..."
sudo mkdir -p /opt/cryptotrader/{backend,frontend,migrations,backups}
sudo mkdir -p /var/log/cryptotrader
sudo chown -R cryptotrader:cryptotrader /opt/cryptotrader /var/log/cryptotrader
echo "✅ Directories created"

# Setup SSH for cryptotrader user
echo "🔑 Setting up SSH key..."
sudo -u cryptotrader bash <<'INNER_SCRIPT'
# Create .ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Backup existing keys if they exist
if [ -f ~/.ssh/github_deploy ]; then
    echo "⚠️  Backing up existing key..."
    mv ~/.ssh/github_deploy ~/.ssh/github_deploy.backup.$(date +%s)
    mv ~/.ssh/github_deploy.pub ~/.ssh/github_deploy.pub.backup.$(date +%s) 2>/dev/null || true
fi

# Generate new SSH key
echo "🔐 Generating new SSH key..."
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""

# Add public key to authorized_keys
echo "📝 Adding public key to authorized_keys..."
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Remove duplicates from authorized_keys
sort -u ~/.ssh/authorized_keys -o ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/github_deploy
chmod 644 ~/.ssh/github_deploy.pub

echo "✅ SSH key generated and configured"
INNER_SCRIPT

# Test SSH locally
echo ""
echo "🧪 Testing SSH key locally..."
if sudo -u cryptotrader ssh -i /home/cryptotrader/.ssh/github_deploy -o StrictHostKeyChecking=no cryptotrader@localhost whoami &>/dev/null; then
    echo "✅ SSH key works locally!"
else
    echo "⚠️  Local SSH test failed, but this might be OK if SSH is not configured for localhost"
fi

# Get VM IP address
VM_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Copy the PRIVATE KEY below to GitHub Secrets"
echo "   - Go to: GitHub Repository → Settings → Secrets and variables → Actions"
echo "   - Update or create secret: VM_SSH_KEY"
echo "   - Paste the ENTIRE key (including BEGIN and END lines)"
echo ""
echo "2. Verify these GitHub Secrets are set:"
echo "   - VM_SSH_KEY: (the private key below)"
echo "   - VM_HOST: $VM_IP"
echo "   - VM_USER: cryptotrader"
echo "   - BACKEND_REPO: your-username/your-backend-repo"
echo "   - REPO_ACCESS_TOKEN: (your GitHub PAT)"
echo ""
echo "========================================="
echo "🔑 PRIVATE KEY - COPY THIS TO GITHUB:"
echo "========================================="
sudo cat /home/cryptotrader/.ssh/github_deploy
echo "========================================="
echo ""
echo "📌 Public Key (for reference):"
sudo cat /home/cryptotrader/.ssh/github_deploy.pub
echo ""
echo "========================================="
echo "🧪 Test Command (run from your local machine):"
echo "========================================="
echo "ssh -i /path/to/saved/private/key cryptotrader@$VM_IP whoami"
echo ""
echo "Expected output: cryptotrader"
echo "========================================="

