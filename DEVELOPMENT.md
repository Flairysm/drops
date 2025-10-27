# Development Environment Setup Complete! 🎉

## 🚀 **Your Development Environment**

### **URLs:**
- **Development**: https://drops-wine.vercel.app
- **Production**: https://dropstcg.vercel.app

### **Branches:**
- **Development Branch**: `develop` (for testing new features)
- **Production Branch**: `main` (for stable releases)

## 🔄 **Development Workflow**

### **1. Working on New Features:**
```bash
# Switch to development branch
git checkout develop

# Create feature branch
git checkout -b feature/new-feature-name

# Make your changes
# Test locally: npm run dev

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push to GitHub
git push origin feature/new-feature-name
```

### **2. Testing on Development Environment:**
```bash
# Switch to development project
vercel link --project drops --yes

# Deploy to development
vercel --prod

# Test at: https://drops-wine.vercel.app
```

### **3. Merging to Production:**
```bash
# Merge feature to develop
git checkout develop
git merge feature/new-feature-name
git push origin develop

# Test on development environment
# If everything works, merge to main
git checkout main
git merge develop
git push origin main

# Switch to production project
vercel link --project dropstcg --yes

# Deploy to production
vercel --prod
```

## 🛠 **Quick Commands**

### **Switch to Development:**
```bash
git checkout develop
vercel link --project drops --yes
vercel --prod
```

### **Switch to Production:**
```bash
git checkout main
vercel link --project dropstcg --yes
vercel --prod
```

### **Check Current Project:**
```bash
vercel project ls
```

## 📋 **Environment Variables**

Both environments use the same database and configuration for now. In the future, you can:

1. **Create separate development database**
2. **Add development-specific environment variables**
3. **Use feature flags for gradual rollouts**

## 🎯 **Next Steps**

1. **Test the development environment**: Visit https://drops-wine.vercel.app
2. **Create a feature branch**: `git checkout -b feature/test-feature`
3. **Make changes and test on development**
4. **When ready, merge to production**

## 🔧 **Troubleshooting**

### **If deployment fails:**
```bash
vercel logs drops-wine.vercel.app
```

### **If environment variables are missing:**
```bash
vercel env ls
vercel env add VARIABLE_NAME production
```

### **If wrong project is linked:**
```bash
vercel link --project drops --yes  # for development
vercel link --project dropstcg --yes  # for production
```

---

**Happy developing! 🚀**
