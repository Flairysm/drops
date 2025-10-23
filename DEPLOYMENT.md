# 🚀 Deployment Guide for Pokemon Card Game

## Vercel Deployment Steps

### 1. Prerequisites
- [Vercel account](https://vercel.com) (free tier available)
- [GitHub repository](https://github.com) with your code
- [PostgreSQL database](https://neon.tech) (recommended for free tier)

### 2. Database Setup (Neon.tech - Free PostgreSQL)
1. Go to [neon.tech](https://neon.tech)
2. Create a free account
3. Create a new project
4. Copy the connection string (it will look like: `postgresql://username:password@hostname/database`)

### 3. Vercel Deployment
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: Leave as default
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 4. Environment Variables
In Vercel dashboard, go to Settings > Environment Variables and add:

```
DATABASE_URL=postgresql://username:password@hostname/database
JWT_SECRET=your-super-secret-jwt-key-here
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-admin-password
NODE_ENV=production
```

### 5. Database Migration
After deployment, you'll need to run database migrations:
1. Go to your Vercel function logs
2. The app will automatically create tables on first run

### 6. Custom Domain (Optional)
1. In Vercel dashboard, go to Settings > Domains
2. Add your custom domain
3. Update DNS settings as instructed

## 🎯 Quick Start Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from your project directory
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add ADMIN_EMAIL
vercel env add ADMIN_PASSWORD
```

## 🔧 Troubleshooting

### Common Issues:
1. **Database Connection**: Ensure DATABASE_URL is correct
2. **Build Errors**: Check that all dependencies are in package.json
3. **API Routes**: Verify vercel.json configuration
4. **Environment Variables**: Make sure all required vars are set

### Performance Tips:
- Enable Vercel Analytics
- Use Vercel Edge Functions for better performance
- Set up proper caching headers

## 📱 Testing with Friends
1. Share your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Create test accounts for your friends
3. Monitor usage in Vercel dashboard
4. Check logs for any issues

## 🛡️ Security Checklist
- [ ] Strong JWT secret
- [ ] Secure admin credentials
- [ ] Database connection secured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Environment variables secured

## 💰 Cost Estimation
- **Vercel**: Free tier (100GB bandwidth, 100GB-hours function execution)
- **Neon Database**: Free tier (0.5GB storage, 10GB transfer)
- **Total**: $0/month for testing with friends!

## 🎮 Game Features Ready for Testing
- ✅ User registration/login
- ✅ Pack opening system
- ✅ Card collection and vault
- ✅ Admin panel
- ✅ Raffle system
- ✅ Shipping requests
- ✅ Credit system
- ✅ Multiple pack types
- ✅ Games (Energy Match, Find Pikachu, Dice)

Your friends can test all features immediately after deployment!
