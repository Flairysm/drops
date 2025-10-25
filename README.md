# Drops TCG - Pokemon Card Game

A modern web-based Pokemon Trading Card Game built with React, TypeScript, and Node.js.

## 🚀 Features

- **Pack Opening**: Open mystery packs with realistic odds
- **Card Collection**: Build your collection in the vault
- **Trading System**: Trade cards with other players
- **Mini Games**: Play dice games, energy matching, and find Pikachu
- **Admin Panel**: Manage cards, packs, and users
- **Shipping System**: Request physical card shipments

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Query** for data fetching
- **Wouter** for routing

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Drizzle ORM** for database operations
- **PostgreSQL** with Supabase
- **JWT** for authentication
- **WebSocket** for real-time updates

### Database
- **PostgreSQL** hosted on Supabase
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for live updates

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Flairysm/drops.git
   cd drops
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database and configuration
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start development servers**
   ```bash
   # Start backend server
   cd server && npm run dev
   
   # Start frontend (in new terminal)
   cd client && npm run dev
   ```

## 📁 Project Structure

```
drops/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Node.js backend
│   ├── routes/            # API routes
│   ├── storage/           # Database operations
│   └── auth/              # Authentication logic
├── shared/                # Shared types and schemas
├── migrations/            # Database migrations
└── public/                # Static assets
```

## 🎮 Game Features

### Pack Opening
- **Mystery Packs**: Random card selection with tier-based odds
- **Classic Packs**: Fixed card sets with guaranteed pulls
- **Special Packs**: Limited edition cards with unique odds
- **Animation System**: Smooth pack opening experience

### Card Management
- **Vault System**: Store and organize your cards
- **Trading**: Exchange cards with other players
- **Refund System**: Convert cards back to credits
- **Shipping**: Request physical card shipments

### Mini Games
- **Dice Game**: Roll dice to win credits
- **Energy Match**: Match energy types for rewards
- **Find Pikachu**: Hidden object game

## 🔧 Development

### Code Quality
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **CodeRabbit** for AI-powered code reviews

### Testing
- **Jest** for unit testing
- **React Testing Library** for component testing
- **Supertest** for API testing

### Deployment
- **Vercel** for frontend hosting
- **Supabase** for database and backend functions
- **GitHub Actions** for CI/CD

## 📊 Database Schema

### Core Tables
- `users` - User accounts and profiles
- `user_cards` - User's card collection
- `mystery_pack` - Available mystery packs
- `mystery_prize` - Cards available in mystery packs
- `transactions` - Credit transactions and purchases
- `shipping_requests` - Physical card shipment requests

### Admin Tables
- `classic_pack` - Classic pack definitions
- `classic_prize` - Cards in classic packs
- `special_pack` - Special pack definitions
- `special_prize` - Cards in special packs
- `raffles` - Raffle events and prizes

## 🔒 Security

- **JWT Authentication** with secure tokens
- **Row Level Security** for database access
- **Input Validation** and sanitization
- **Rate Limiting** to prevent abuse
- **CORS Configuration** for secure cross-origin requests
- **Environment Variables** for sensitive data

## 🚀 Deployment

### Production Environment
- **Frontend**: Deployed on Vercel
- **Backend**: Supabase Edge Functions
- **Database**: Supabase PostgreSQL
- **CDN**: Vercel's global CDN

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Security
JWT_SECRET=...
SESSION_SECRET=...

# Admin
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

## 📈 Performance

- **Code Splitting** for faster loading
- **Image Optimization** with WebP format
- **Database Indexing** for query performance
- **Caching** with React Query
- **Bundle Optimization** with Vite

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced trading features
- [ ] Tournament system
- [ ] Social features
- [ ] Analytics dashboard
- [ ] API documentation

## 📞 Support

For support, email support@dropstcg.com or create an issue on GitHub.

---

**Built with ❤️ for Pokemon fans everywhere!**
