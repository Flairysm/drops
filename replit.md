# Drops - Trading Card Game Application

## Overview

Drops is a modern web application that simulates a trading card game (TCG) arcade experience. Users can play various games to earn virtual trading cards, manage their card collection, and purchase credits. The application features multiple gaming modes including Plinko, Wheel of Fortune, and virtual pack openings with different card rarities and tiers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with authentication-based route protection
- **UI Components**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom gaming-themed design tokens and animations
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Session Management**: Express sessions with PostgreSQL storage
- **Error Handling**: Centralized error middleware with structured error responses

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection Pooling**: Neon serverless connection pooling with WebSocket support

### Authentication and Authorization
- **Provider**: Replit OpenID Connect (OIDC) integration
- **Strategy**: Passport.js with OpenID Connect strategy
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Security**: HTTP-only cookies with secure flags and CSRF protection

### Gaming System Architecture
- **Game Types**: Three distinct gaming modes (Plinko, Wheel, Pack Opening)
- **Card Tiers**: Seven-tier rarity system (D, C, B, A, S, SS, SSS) - migrated from old 5-tier system (August 30, 2025)
- **Probability Engine**: Weighted random selection based on configured odds
- **Credit System**: Virtual currency with purchase and deduction mechanisms

### Database Schema Design
- **Users**: Authentication data, credits, spending tracking, and moderation flags
- **Cards**: Card definitions with tiers, pack types, market values, and stock
- **User Cards**: Junction table for user card ownership with acquisition tracking
- **Game Sessions**: Historical record of all gaming activities and outcomes
- **Transactions**: Financial transaction log for credit purchases and spending
- **Global Feed**: Real-time activity feed for community engagement

## External Dependencies

### Third-Party Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Replit Authentication**: OIDC provider for user authentication and authorization
- **Replit Development Tools**: Hot reload, error overlay, and development banner integration

### Key NPM Packages
- **Database**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-zod`
- **Authentication**: `passport`, `openid-client`, `express-session`
- **UI Framework**: `@radix-ui/*` components, `tailwindcss`, `class-variance-authority`
- **Validation**: `zod`, `@hookform/resolvers`
- **State Management**: `@tanstack/react-query`
- **Utilities**: `date-fns`, `clsx`, `memoizee`

### Development Dependencies
- **Build Tools**: Vite with React plugin and TypeScript support
- **Code Quality**: ESBuild for production builds
- **Development Experience**: Hot module replacement, error overlays, and source mapping

## Recent Changes

### August 30, 2025 - Major Tier System Overhaul
- **Tier System Migration**: Completely migrated from 5-tier (Common, Uncommon, Rare, Super Rare, Legendary) to 7-tier system (D, C, B, A, S, SS, SSS)
- **Database Migration**: Updated all existing cards, pull rates, and global feed entries to use new tier names
- **Frontend Updates**: Updated all UI components including admin forms, vault filters, landing page, wheel game, pack opening animation, and card displays
- **Pull Rate Rebalancing**: Completely rebalanced pull rates for all pack types with new 7-tier distribution
- **CSS Styling**: Updated tier colors, glow effects, and styling to support 7 distinct tiers
- **Vault Functionality**: Confirmed refund calculations use 100% card value and updated tier filtering to work with new system

### August 31, 2025 - App Rebranding to "Drops"
- **Complete Rebranding**: Updated all app name references from "Flair TCG Arcade" to "Drops"
- **Navigation Updates**: Updated header and navigation branding across all pages
- **Landing Page**: Updated main hero section and footer branding
- **Documentation**: Updated replit.md to reflect new app name
- **Toast Messages**: Updated registration welcome message to use new branding