# 🚀 Deploy Pokemon Card Game with Supabase

This guide shows you how to deploy your Pokemon Card Game using Supabase Edge Functions, which will solve the database connection issues.

## 📋 **Prerequisites**

1. **Supabase CLI installed**
2. **Your Supabase project active**
3. **GitHub repository connected to Supabase**

## 🛠️ **Setup Steps**

### **Step 1: Install Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login
```

### **Step 2: Initialize Supabase in your project**

```bash
# Initialize Supabase (if not already done)
supabase init

# Link to your existing project
supabase link --project-ref orgjlvvrirnpszenxjha
```

### **Step 3: Deploy Edge Functions**

```bash
# Deploy the Pokemon game function
supabase functions deploy pokemon-game

# Set environment variables
supabase secrets set SUPABASE_URL=https://orgjlvvrirnpszenxjha.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key-here
```

### **Step 4: Update Frontend to use Supabase**

Update your frontend to use Supabase Edge Functions instead of Vercel:

```typescript
// In client/src/lib/queryClient.ts
const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    // Use Supabase Edge Functions
    return 'https://orgjlvvrirnpszenxjha.supabase.co/functions/v1/pokemon-game';
  }
  return 'http://localhost:3000';
};
```

## 🎯 **Benefits of Supabase Deployment**

✅ **No database connection issues** - Everything runs on Supabase infrastructure
✅ **Built-in authentication** - Uses Supabase Auth
✅ **Real-time features** - Built-in real-time subscriptions
✅ **Edge functions** - Fast serverless functions
✅ **Integrated database** - Direct access to your Supabase database

## 🔧 **Alternative: Quick Fix for Current Setup**

If you want to keep using Vercel, try this quick fix:

1. **Go to your Supabase dashboard**
2. **Settings → Database → Connection pooling**
3. **Copy the pooling connection string**
4. **Update Vercel environment variable**

The pooling URL should look like:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

## 🚀 **Deploy Commands**

```bash
# Deploy everything
supabase functions deploy pokemon-game

# Check deployment status
supabase functions list

# View logs
supabase functions logs pokemon-game
```

## 📱 **Your App URLs**

- **Supabase Edge Function**: `https://orgjlvvrirnpszenxjha.supabase.co/functions/v1/pokemon-game`
- **Frontend**: `https://dropstcg.vercel.app` (update to use Supabase functions)

## 🎮 **Testing**

Test your deployment:

```bash
# Test health endpoint
curl https://orgjlvvrirnpszenxjha.supabase.co/functions/v1/pokemon-game/health

# Test login
curl -X POST https://orgjlvvrirnpszenxjha.supabase.co/functions/v1/pokemon-game/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

## 🔄 **Migration from Vercel**

1. **Deploy Supabase Edge Functions**
2. **Update frontend API URLs**
3. **Test all endpoints**
4. **Update Vercel to serve only frontend**

This approach will solve your database connection issues completely! 🎉
