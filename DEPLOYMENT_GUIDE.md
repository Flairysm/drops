# 🚀 Drops TCG Deployment Guide

This guide will help you deploy and manage your Drops TCG application efficiently.

## 📋 Prerequisites

- Node.js 18+ installed
- Vercel CLI installed (`npm install -g vercel`)
- Supabase CLI installed (`brew install supabase/tap/supabase`)
- Git configured

## 🛠️ Available Scripts

### Development
```bash
# Start full development environment (client + server)
npm run dev:full

# Start server only
npm run dev

# Test database connection
npm run db:test
```

### Deployment
```bash
# Full deployment with checks
npm run deploy

# Quick deployment
npm run deploy:quick

# Check deployment status
npm run status

# View deployment logs
npm run logs
```

### Database Management
```bash
# Interactive database management
npm run db:setup

# Test database connection
npm run db:test

# Push database schema changes
npm run db:push
```

### Environment Management
```bash
# Pull environment variables from Vercel
npm run env:pull

# List environment variables
npm run env:list

# Setup required environment variables
./scripts/env-setup.sh setup
```

## 🚀 Quick Deployment

1. **Make sure you're logged in to Vercel:**
   ```bash
   vercel login
   ```

2. **Deploy with one command:**
   ```bash
   npm run deploy
   ```

3. **Check your deployment:**
   ```bash
   npm run status
   ```

## 🔧 Environment Variables

Required environment variables in Vercel:

- `DATABASE_URL` - Your Supabase database connection string
- `JWT_SECRET` - Secret for JWT token signing
- `SESSION_SECRET` - Secret for session management

### Setting up environment variables:

```bash
# Pull existing variables
npm run env:pull

# Add new variables
./scripts/env-setup.sh add DATABASE_URL "your-connection-string" production

# Setup all required variables
./scripts/env-setup.sh setup
```

## 🗄️ Database Setup

1. **Test your database connection:**
   ```bash
   npm run db:test
   ```

2. **Run database migrations:**
   ```bash
   npm run db:push
   ```

3. **Interactive database management:**
   ```bash
   npm run db:setup
   ```

## 🔍 Troubleshooting

### Database Connection Issues
```bash
# Test connection
npm run db:test

# Check environment variables
npm run env:list

# Pull latest environment variables
npm run env:pull
```

### Deployment Issues
```bash
# Check deployment logs
npm run logs

# Check deployment status
npm run status

# Redeploy
npm run deploy:quick
```

### Build Issues
```bash
# Check TypeScript
npm run check

# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 📊 Monitoring

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Application Health:** `https://your-app.vercel.app/api/health`

## 🆘 Getting Help

1. Check the logs: `npm run logs`
2. Test database: `npm run db:test`
3. Check environment: `npm run env:list`
4. View deployment status: `npm run status`

## 🔄 CI/CD with GitHub Actions

The project includes GitHub Actions for automatic deployment:

- **Push to main/master:** Automatically deploys to production
- **Pull requests:** Runs tests and builds
- **Required secrets:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## 📝 Notes

- Always test locally before deploying
- Keep your environment variables secure
- Monitor your database connection
- Check logs regularly for issues
