#!/bin/bash
set -e

echo "========================================="
echo "CryptoTrader VM Setup"
echo "========================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required software
echo "📦 Installing required software..."
sudo apt-get install -y \
    openjdk-17-jre-headless \
    postgresql \
    postgresql-contrib \
    postgresql-client \
    nginx \
    rsync \
    curl

# Create deployment user
echo "👤 Creating deployment user..."
sudo useradd -m -s /bin/bash cryptotrader 2>/dev/null || echo "User already exists"

# Create directories
echo "📁 Creating deployment directories..."
sudo mkdir -p /opt/cryptotrader/{backend,frontend,migrations,backups}
sudo mkdir -p /var/log/cryptotrader
sudo chown -R cryptotrader:cryptotrader /opt/cryptotrader /var/log/cryptotrader

# Setup PostgreSQL
echo "🗄️  Setting up PostgreSQL database..."
sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE cryptotrader;

-- Create user
CREATE USER cryptotrader WITH PASSWORD 'cryptotrader123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cryptotrader TO cryptotrader;

-- Grant schema privileges (PostgreSQL 15+)
\c cryptotrader
GRANT ALL ON SCHEMA public TO cryptotrader;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cryptotrader;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cryptotrader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cryptotrader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO cryptotrader;
EOF

# Test database connection
echo "🧪 Testing database connection..."
PGPASSWORD='cryptotrader123' psql -h localhost -U cryptotrader -d cryptotrader -c "SELECT version();" > /dev/null
echo "✅ Database connection successful!"

# Setup SSH for deployment user
echo "🔑 Setting up SSH for deployment..."
sudo -u cryptotrader bash <<'EOF'
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Generate SSH key for GitHub Actions
if [ ! -f ~/.ssh/github_deploy ]; then
    ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""
    echo "✅ SSH key generated"
else
    echo "⏭️  SSH key already exists"
fi

# Add public key to authorized_keys
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

echo ""
echo "========================================="
echo "🔑 IMPORTANT: Copy this PRIVATE KEY to GitHub Secrets as VM_SSH_KEY"
echo "========================================="
cat ~/.ssh/github_deploy
echo "========================================="
EOF

# Configure firewall (if ufw is installed)
if command -v ufw &> /dev/null; then
    echo "🔥 Configuring firewall..."
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS (for future SSL)
    sudo ufw --force enable
    echo "✅ Firewall configured"
fi

# Enable services
echo "🚀 Enabling services..."
sudo systemctl enable postgresql
sudo systemctl enable nginx
sudo systemctl start postgresql
sudo systemctl start nginx

# Verify installations
echo ""
echo "========================================="
echo "✅ VM Setup Complete!"
echo "========================================="
echo "Java version:"
java -version 2>&1 | head -n 1
echo ""
echo "PostgreSQL version:"
psql --version
echo ""
echo "Nginx version:"
nginx -v 2>&1
echo ""
echo "========================================="
echo "📋 Next Steps:"
echo "========================================="
echo "1. Copy the SSH PRIVATE KEY above to GitHub Secrets as VM_SSH_KEY"
echo "2. Add these GitHub Secrets to your frontend repository:"
echo "   - BACKEND_REPO: your-username/your-backend-repo"
echo "   - REPO_ACCESS_TOKEN: (GitHub Personal Access Token)"
echo "   - VM_SSH_KEY: (the private key shown above)"
echo "   - VM_HOST: $(hostname -I | awk '{print $1}')"
echo "   - VM_USER: cryptotrader"
echo ""
echo "3. IMPORTANT: Change the database password in production!"
echo "   Current password: cryptotrader123"
echo "   Update in: /etc/systemd/system/cryptotrader-backend.service"
echo ""
echo "4. IMPORTANT: Set a secure WALLET_ENCRYPTION_MASTER_KEY!"
echo "   This will be set when the backend service is deployed."
echo ""
echo "5. Push to main branch to trigger deployment"
echo "========================================="

