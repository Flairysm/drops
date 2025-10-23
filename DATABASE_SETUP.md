# 🗄️ Database Setup for Production

## Free PostgreSQL Database Options

### Option 1: Neon.tech (Recommended)
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create a new project
4. Copy the connection string
5. Example: `postgresql://username:password@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require`

### Option 2: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string
5. Example: `postgresql://postgres:password@db.xyz.supabase.co:5432/postgres`

### Option 3: Railway
1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Add PostgreSQL service
4. Copy the connection string

## Environment Variables Setup

In your Vercel dashboard, add these environment variables:

```bash
# Database
DATABASE_URL=postgresql://username:password@hostname/database

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

# Admin Credentials
ADMIN_EMAIL=admin@yourgame.com
ADMIN_PASSWORD=your-secure-admin-password

# Environment
NODE_ENV=production
```

## Database Migration

The app will automatically create all necessary tables on first run. Tables include:

- `users` - User accounts and credits
- `classic_packs` - Classic pack definitions
- `special_packs` - Special pack definitions
- `mystery_packs` - Mystery pack definitions
- `classic_prize` - Classic pack cards
- `special_prize` - Special pack cards
- `mystery_prize` - Mystery pack cards
- `user_packs` - User's purchased packs
- `user_cards` - User's collected cards
- `raffles` - Raffle system
- `shipping_requests` - Shipping management

## Security Checklist

- [ ] Strong JWT secret (32+ characters)
- [ ] Secure admin password
- [ ] Database connection uses SSL
- [ ] Environment variables are set in Vercel
- [ ] Database credentials are not in code

## Testing Database Connection

After deployment, check:
1. Go to your Vercel function logs
2. Look for successful database connection messages
3. Test user registration to verify database writes
4. Check admin panel functionality

## Backup Strategy

For production:
1. Enable automatic backups in your database provider
2. Set up monitoring for database health
3. Consider read replicas for high traffic

## Cost Estimation

- **Neon.tech**: Free tier (0.5GB storage, 10GB transfer)
- **Supabase**: Free tier (500MB storage, 2GB transfer)
- **Railway**: $5/month for PostgreSQL

All free tiers are perfect for testing with friends!
