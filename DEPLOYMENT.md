# Visitor Management System - Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Visitor Management System for MLAs/MPs serving rural constituencies. The system is built with Next.js 15, TypeScript, and SQLite database.

## Prerequisites

### System Requirements
- **Operating System**: Linux, macOS, or Windows
- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Memory**: Minimum 2GB RAM, recommended 4GB+
- **Storage**: Minimum 1GB free space
- **Network**: Internet connection for initial setup

### Software Dependencies
- Git
- Node.js 18+
- npm 8+
- SQLite (included with Node.js)

## Quick Deployment Steps

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd visitor-management-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
# Database Configuration
DATABASE_URL="file:./dev.db"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="24h"

# Application Configuration
NODE_ENV="production"
PORT="3000"

# Optional: External Services (for future enhancements)
# EMAIL_SERVICE_PROVIDER="sendgrid"
# EMAIL_API_KEY="your-email-api-key"
# SMS_SERVICE_PROVIDER="twilio"
# SMS_ACCOUNT_SID="your-twilio-sid"
# SMS_AUTH_TOKEN="your-twilio-token"
```

### 4. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Seed database with demo data
npm run db:seed
```

### 5. Build the Application
```bash
npm run build
```

### 6. Start the Application
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Detailed Deployment Options

### Option 1: Local Development/Testing
Perfect for testing the system before deployment.

```bash
# Development mode with hot reload
npm run dev

# Access the application
# http://localhost:3000
```

### Option 2: Production Server
For deploying on your own server or VPS.

#### Using PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start npm --name "visitor-management" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### Using Systemd (Linux)
Create a service file:
```bash
sudo nano /etc/systemd/system/visitor-management.service
```

Add the following content:
```ini
[Unit]
Description=Visitor Management System
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/visitor-management-system
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable visitor-management
sudo systemctl start visitor-management
```

### Option 3: Cloud Deployment

#### Vercel (Recommended for Next.js)
1. Push your code to GitHub/GitLab
2. Sign up at [vercel.com](https://vercel.com)
3. Import your repository
4. Configure environment variables in Vercel dashboard
5. Deploy automatically

**Environment Variables for Vercel:**
```
DATABASE_URL=sqlite:./data.db
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
NODE_ENV=production
```

#### Railway
1. Sign up at [railway.app](https://railway.app)
2. Create new project
3. Connect your GitHub repository
4. Configure build command: `npm run build`
5. Configure start command: `npm start`
6. Add environment variables

#### DigitalOcean App Platform
1. Create account at [digitalocean.com](https://digitalocean.com)
2. Create new App
3. Connect your GitHub repository
4. Configure build command: `npm run build`
5. Configure run command: `npm start`
6. Add environment variables

## Database Management

### Backup Strategy
```bash
# Create backup
cp dev.db backup-$(date +%Y%m%d).db

# Restore backup
cp backup-20231201.db dev.db
```

### Automated Backup Script
Create `backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp dev.db $BACKUP_DIR/backup_$DATE.db

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.db" -mtime +30 -delete
```

Make it executable and add to crontab:
```bash
chmod +x backup.sh
crontab -e
```
Add line:
```
0 2 * * * /path/to/backup.sh
```

## Security Configuration

### Production Security Checklist
- [ ] Change JWT secret to a strong, random value
- [ ] Use HTTPS in production
- [ ] Set up proper firewall rules
- [ ] Configure SSL/TLS certificates
- [ ] Regular security updates
- [ ] Database backups
- [ ] Access control and user permissions

### Environment Variables Security
```bash
# Generate secure JWT secret
openssl rand -base64 32

# Set file permissions
chmod 600 .env
```

### Nginx Configuration (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring and Maintenance

### Application Monitoring
```bash
# Check application logs
pm2 logs visitor-management

# Monitor resource usage
pm2 monit

# Restart application if needed
pm2 restart visitor-management
```

### Database Maintenance
```bash
# Optimize database (periodically)
sqlite3 dev.db "VACUUM;"

# Check database integrity
sqlite3 dev.db "PRAGMA integrity_check;"

# Analyze database for performance
sqlite3 dev.db "ANALYZE;"
```

### Log Management
```bash
# Set up log rotation
sudo nano /etc/logrotate.d/visitor-management
```

Add configuration:
```
/path/to/visitor-management-system/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
}
```

## Demo Credentials

After running the seed script, you can use these credentials:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Admin | admin@example.com | password | Full system access |
| Politician | politician@example.com | password | Constituent management |
| Staff | staff@example.com | password | Day-to-day operations |
| Staff 2 | staff2@example.com | password | Support staff |

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Database Permission Issues
```bash
# Check file permissions
ls -la dev.db

# Fix permissions
chmod 664 dev.db
```

#### Build Errors
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run build
```

#### Migration Issues
```bash
# Reset database (WARNING: This will delete all data)
npm run db:reset

# Re-seed database
npm run db:seed
```

### Performance Optimization

#### Enable Caching
```bash
# Install Redis (optional, for advanced caching)
sudo apt-get install redis-server

# Configure Redis in your application
# (Add Redis client to package.json if needed)
```

#### Optimize Database Queries
```bash
# Enable SQLite WAL mode for better performance
sqlite3 dev.db "PRAGMA journal_mode=WAL;"
```

#### Static File Serving
Configure your web server to serve static files directly:
```nginx
location /_next/static/ {
    alias /path/to/visitor-management-system/.next/static/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Scaling Considerations

### Load Balancing
For high-traffic deployments, consider:
- Multiple application instances
- Load balancer (Nginx, HAProxy)
- Database connection pooling

### Database Scaling
For larger deployments:
- Migrate to PostgreSQL or MySQL
- Set up database replication
- Implement read replicas

### Content Delivery Network (CDN)
- Use CDN for static assets
- Configure caching headers
- Optimize image delivery

## Support and Maintenance

### Regular Maintenance Tasks
- [ ] Weekly database backups
- [ ] Monthly security updates
- [ ] Quarterly performance reviews
- [ ] Annual infrastructure review

### Contact Support
For technical support:
- Check the troubleshooting section
- Review application logs
- Contact development team

### Updates and Upgrades
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Rebuild application
npm run build

# Restart application
pm2 restart visitor-management
```

## Conclusion

This Visitor Management System is now ready for deployment. The system provides comprehensive features for managing constituent interactions, tracking issues, and generating reports. Choose the deployment option that best fits your needs and follow the security best practices for production use.

For additional features or customizations, refer to the source code documentation or contact the development team.