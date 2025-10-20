# SSH Key Authentication Troubleshooting

## The Problem

You're getting: `Permission denied (publickey,password)` when GitHub Actions tries to connect to your VM.

This means the SSH key in GitHub Secrets doesn't match what's on your VM.

## Quick Fix (5 Minutes)

### Step 1: Generate a New SSH Key on Your VM

SSH into your VM and run:

```bash
# Switch to the deployment user
sudo su - cryptotrader

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Generate a new SSH key specifically for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""

# Add the public key to authorized_keys
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display the PRIVATE key (you'll copy this to GitHub)
echo "========================================="
echo "COPY THIS ENTIRE PRIVATE KEY TO GITHUB:"
echo "========================================="
cat ~/.ssh/github_deploy
echo "========================================="
```

### Step 2: Copy the Private Key

Copy **the entire output** from the previous command, including:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- All the lines in between
- `-----END OPENSSH PRIVATE KEY-----`

### Step 3: Update GitHub Secret

1. Go to your frontend repository on GitHub
2. Settings → Secrets and variables → Actions
3. Find `VM_SSH_KEY` and click "Update"
4. Paste the **entire private key** you just copied
5. Click "Update secret"

### Step 4: Verify the Setup

Still on your VM, test the key:

```bash
# Test that the key works locally
ssh -i ~/.ssh/github_deploy cryptotrader@localhost whoami
# Should output: cryptotrader
```

### Step 5: Test from GitHub Actions

Push a small change to trigger the workflow:

```bash
# On your local machine
echo "# Test SSH fix" >> README.md
git add README.md
git commit -m "Test SSH authentication"
git push origin main
```

## Common Issues & Solutions

### Issue 1: "Still getting Permission denied"

**Check 1**: Verify the user exists
```bash
# On VM
id cryptotrader
# Should show user info, not "no such user"
```

**Check 2**: Verify authorized_keys permissions
```bash
# On VM
sudo su - cryptotrader
ls -la ~/.ssh/
# authorized_keys should be: -rw------- (600)
# .ssh directory should be: drwx------ (700)
```

**Fix**:
```bash
sudo su - cryptotrader
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

**Check 3**: Verify the public key is in authorized_keys
```bash
# On VM
sudo su - cryptotrader
cat ~/.ssh/authorized_keys
# Should contain the public key (starts with "ssh-ed25519")
```

### Issue 2: "Key format is invalid"

The private key in GitHub Secrets must be **exactly** as generated, with no extra spaces or line breaks.

**Fix**: Copy the key again, making sure to include:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
...
-----END OPENSSH PRIVATE KEY-----
```

### Issue 3: "VM_USER is wrong"

**Check**: Verify the GitHub Secret `VM_USER` matches the actual user on the VM.

```bash
# On VM - check what user owns the .ssh directory
ls -la /home/
# Should see "cryptotrader" directory

# Verify the user
id cryptotrader
```

**Fix**: Update `VM_USER` secret in GitHub to match the actual username.

### Issue 4: "SSH is not enabled on VM"

**Check**:
```bash
# On VM
sudo systemctl status ssh
# or
sudo systemctl status sshd
```

**Fix**:
```bash
sudo systemctl enable ssh
sudo systemctl start ssh
```

### Issue 5: "Firewall blocking SSH"

**Check**:
```bash
# On VM
sudo ufw status
```

**Fix**:
```bash
sudo ufw allow 22/tcp
sudo ufw reload
```

## Manual Test from Your Local Machine

To verify the SSH key works, test it from your local machine:

```bash
# Save the private key to a temporary file
cat > /tmp/test_key << 'EOF'
-----BEGIN OPENSSH PRIVATE KEY-----
[paste the private key here]
-----END OPENSSH PRIVATE KEY-----
EOF

# Set correct permissions
chmod 600 /tmp/test_key

# Test SSH connection
ssh -i /tmp/test_key cryptotrader@YOUR_VM_IP whoami
# Should output: cryptotrader

# Test rsync (what GitHub Actions does)
mkdir -p /tmp/test-deploy
echo "test" > /tmp/test-deploy/test.txt
rsync -avz -e "ssh -i /tmp/test_key" /tmp/test-deploy/ cryptotrader@YOUR_VM_IP:/tmp/test/

# Cleanup
rm /tmp/test_key
rm -rf /tmp/test-deploy
```

If this works, the key is correct and the issue is with how it's stored in GitHub Secrets.

## Debugging on VM

Check SSH logs to see why authentication is failing:

```bash
# On VM
sudo tail -f /var/log/auth.log
# or on some systems:
sudo journalctl -u ssh -f
```

Then trigger a deployment and watch the logs in real-time.

Common log messages:

**"Authentication refused: bad ownership or modes"**
→ Fix permissions (see Issue 1 above)

**"User cryptotrader not allowed"**
→ Check `/etc/ssh/sshd_config` for `AllowUsers` or `DenyUsers` directives

**"Could not open authorized keys"**
→ Fix permissions on `.ssh` directory and `authorized_keys` file

## Complete Reset (If Nothing Else Works)

If you're still stuck, do a complete reset:

```bash
# On VM - as root or with sudo
sudo userdel -r cryptotrader  # Delete user and home directory
sudo useradd -m -s /bin/bash cryptotrader  # Recreate user
sudo mkdir -p /opt/cryptotrader/{backend,frontend,migrations,backups}
sudo chown -R cryptotrader:cryptotrader /opt/cryptotrader

# Switch to the new user
sudo su - cryptotrader

# Generate new SSH key
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display private key
cat ~/.ssh/github_deploy
```

Then update the `VM_SSH_KEY` secret in GitHub with the new private key.

## Verify All GitHub Secrets

Make sure all secrets are set correctly:

| Secret | How to Verify |
|--------|---------------|
| `VM_SSH_KEY` | Should be the complete private key from `~/.ssh/github_deploy` |
| `VM_HOST` | Should be your VM's IP address (test: `ping YOUR_VM_IP`) |
| `VM_USER` | Should be `cryptotrader` (test: `id cryptotrader` on VM) |
| `BACKEND_REPO` | Should be `owner/repo-name` format |
| `REPO_ACCESS_TOKEN` | Should be a valid GitHub PAT with `repo` scope |

## Still Not Working?

If you've tried everything above and it still doesn't work, there might be an issue with the SSH key format in GitHub Secrets.

### Alternative: Use a Different Key Format

Try RSA instead of ed25519:

```bash
# On VM
sudo su - cryptotrader
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github_deploy_rsa -N ""
cat ~/.ssh/github_deploy_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display the private key
cat ~/.ssh/github_deploy_rsa
```

Update `VM_SSH_KEY` in GitHub with this new RSA key.

## Quick Checklist

- [ ] SSH key generated on VM as `cryptotrader` user
- [ ] Public key added to `~/.ssh/authorized_keys`
- [ ] Permissions: `.ssh` = 700, `authorized_keys` = 600
- [ ] Private key copied to GitHub Secret `VM_SSH_KEY` (complete, no extra spaces)
- [ ] `VM_USER` = `cryptotrader`
- [ ] `VM_HOST` = correct IP address
- [ ] SSH service running on VM
- [ ] Port 22 open in firewall
- [ ] Can SSH manually with the key
- [ ] GitHub Secrets updated and saved

