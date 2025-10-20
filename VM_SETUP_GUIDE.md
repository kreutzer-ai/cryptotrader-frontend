# VM Setup Guide for Automated Deployment

This guide walks you through preparing your VM for automated deployment from GitHub Actions.

## Prerequisites

- A Linux VM (Ubuntu 20.04+ or Debian 11+ recommended)
- SSH access to the VM
- Root or sudo privileges

## Step 1: Connect to Your VM

```bash
ssh your-username@your-vm-ip
```

## Step 2: Run the Automated Setup Script

Copy and paste this entire script into your VM terminal:

```bash
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
```

## Step 3: Save the Private Key

After running the script, you'll see a private key displayed. **Copy the entire key** (including the `-----BEGIN` and `-----END` lines) and save it temporarily in a secure location. You'll add this to GitHub Secrets in the next step.

## Step 4: Configure GitHub Secrets

Follow the instructions in `GITHUB_SECRETS_SETUP.md` to add all required secrets to your GitHub repository.

## Step 5: Security Hardening (Recommended)

### Change Database Password

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Change password
ALTER USER cryptotrader WITH PASSWORD 'your-secure-password-here';
\q
```

Then update the password in the backend service configuration (this will be done automatically on first deployment, but you'll need to update it manually):

```bash
sudo nano /etc/systemd/system/cryptotrader-backend.service
# Update the SPRING_DATASOURCE_PASSWORD line
sudo systemctl daemon-reload
```

### Set Wallet Encryption Key

The wallet encryption key will be set in the systemd service file during deployment. Make sure to use a secure random key (32+ characters).

### Disable Password Authentication (Optional)

If you want to use SSH keys only:

```bash
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

## Step 6: Test Deployment

1. Make a small change to your frontend code
2. Commit and push to `main` branch
3. Go to GitHub → Actions tab
4. Watch the deployment workflow run

## Troubleshooting

### Check Service Status

```bash
# Backend service
sudo systemctl status cryptotrader-backend

# Nginx
sudo systemctl status nginx

# PostgreSQL
sudo systemctl status postgresql
```

### View Logs

```bash
# Backend logs
sudo journalctl -u cryptotrader-backend -f

# Nginx access logs
sudo tail -f /var/log/nginx/cryptotrader-frontend-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/cryptotrader-frontend-error.log

# Deployment logs
cat /opt/cryptotrader/deploy.log
```

### Test Endpoints

```bash
# Backend health check
curl http://localhost:8080/actuator/health

# Frontend
curl http://localhost

# From external machine
curl http://YOUR_VM_IP:8080/actuator/health
curl http://YOUR_VM_IP
```

### Common Issues

**Issue**: Database connection refused
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL is listening
sudo netstat -plnt | grep 5432
```

**Issue**: Backend won't start
```bash
# Check logs
sudo journalctl -u cryptotrader-backend -n 100 --no-pager

# Check Java is installed
java -version

# Check JAR file exists
ls -lh /opt/cryptotrader/backend/cryptotrader.jar
```

**Issue**: Frontend not accessible
```bash
# Check nginx is running
sudo systemctl status nginx

# Check nginx configuration
sudo nginx -t

# Check frontend files exist
ls -lh /opt/cryptotrader/frontend/
```

## Manual Deployment Test

Before relying on automated deployment, test manually:

```bash
# Create test deployment package
mkdir -p /tmp/test-deploy
cd /tmp/test-deploy

# Download deployment script from your backend repo
# (You'll need to do this manually or wait for first automated deployment)

# Run deployment
bash /tmp/cryptotrader-deploy/deploy.sh
```

## Monitoring

### Setup Log Rotation

```bash
sudo nano /etc/logrotate.d/cryptotrader
```

Add:
```
/var/log/cryptotrader/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 cryptotrader cryptotrader
    sharedscripts
}
```

### Monitor Disk Space

```bash
# Check disk usage
df -h

# Check deployment directory size
du -sh /opt/cryptotrader/*

# Clean old backups (keeps last 5)
cd /opt/cryptotrader/backups
ls -t | tail -n +6 | xargs -r rm -rf
```

## Backup Strategy

The deployment script automatically creates backups before each deployment in `/opt/cryptotrader/backups/`.

To manually backup:

```bash
# Backup database
sudo -u postgres pg_dump cryptotrader > /tmp/cryptotrader-backup-$(date +%Y%m%d).sql

# Backup application files
tar -czf /tmp/cryptotrader-files-$(date +%Y%m%d).tar.gz /opt/cryptotrader/
```

## Rollback

If a deployment fails, you can rollback to the previous version:

```bash
# Find latest backup
ls -lt /opt/cryptotrader/backups/

# Restore backend
sudo cp /opt/cryptotrader/backups/backup_TIMESTAMP/cryptotrader.jar /opt/cryptotrader/backend/

# Restart service
sudo systemctl restart cryptotrader-backend
```

