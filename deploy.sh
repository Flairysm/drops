#!/bin/bash

echo "🚀 Deploying Drops TCG App..."

# Build the frontend
echo "📦 Building frontend..."
cd client
npm run build
cd ..

# Check if build was successful
if [ ! -d "client/dist" ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend built successfully!"

# Copy frontend build to server public folder
echo "📁 Copying frontend to server..."
rm -rf server/public
cp -r client/dist server/public

echo "✅ Frontend copied to server!"

# Install production dependencies
echo "📥 Installing production dependencies..."
npm install --production

echo "🎉 Deployment ready!"
echo ""
echo "📋 Next steps:"
echo "1. Set up your production database (Supabase/Railway)"
echo "2. Update environment variables"
echo "3. Deploy to your chosen platform"
echo ""
echo "🌐 Quick deploy options:"
echo "- Vercel: vercel"
echo "- Netlify: netlify deploy --prod"
echo "- Railway: railway up"
echo "- Heroku: git push heroku main"
