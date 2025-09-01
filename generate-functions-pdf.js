import puppeteer from 'puppeteer';

const functionDocumentation = {
  "API Endpoints": {
    "Authentication": [
      {
        "endpoint": "GET /api/auth/user",
        "description": "Get current authenticated user information",
        "authentication": "Required",
        "returns": "User object with id, email, credits, etc."
      }
    ],
    "Game Functions": [
      {
        "endpoint": "GET /api/games/:gameType/settings",
        "description": "Get game-specific settings (pricing, configuration)",
        "parameters": "gameType: plinko, wheel, pack",
        "returns": "Game settings with price and configuration"
      },
      {
        "endpoint": "POST /api/games/play",
        "description": "Play a game (Plinko, Wheel, Pack opening)",
        "authentication": "Required",
        "parameters": "gameType, betAmount, plinkoResult/wheelResult",
        "returns": "Game result with card/pack outcome"
      }
    ],
    "Card & Vault Management": [
      {
        "endpoint": "GET /api/vault",
        "description": "Get user's card collection",
        "authentication": "Required",
        "returns": "Array of user's collected cards with details"
      },
      {
        "endpoint": "POST /api/vault/refund",
        "description": "Refund selected cards for credits",
        "authentication": "Required",
        "parameters": "cardIds: array of card IDs to refund",
        "returns": "Success confirmation"
      }
    ],
    "Virtual Pack System": [
      {
        "endpoint": "GET /api/virtual-packs",
        "description": "Get all active virtual packs (Black Bolt, etc.)",
        "authentication": "Not required",
        "returns": "Array of available virtual packs"
      },
      {
        "endpoint": "POST /api/virtual-packs/:id/open",
        "description": "Open a virtual pack and receive 8 cards",
        "authentication": "Required",
        "parameters": "id: virtual pack ID",
        "returns": "8 cards with tiers and details"
      },
      {
        "endpoint": "GET /api/virtual-packs/:id/cards",
        "description": "Get cards assigned to a specific virtual pack",
        "authentication": "Admin only",
        "returns": "Array of cards in the pack's card pool"
      }
    ],
    "Credits & Transactions": [
      {
        "endpoint": "POST /api/credits/purchase",
        "description": "Purchase credits (with bundle bonuses)",
        "authentication": "Required",
        "parameters": "amount, bundleType (bundle_50, bundle_100)",
        "returns": "Credits added confirmation"
      },
      {
        "endpoint": "GET /api/transactions",
        "description": "Get user's transaction history",
        "authentication": "Required",
        "returns": "Array of user's transactions"
      }
    ],
    "Global Feed": [
      {
        "endpoint": "GET /api/feed",
        "description": "Get global activity feed of recent card pulls",
        "parameters": "limit (optional), minTier (optional)",
        "returns": "Array of recent card pulls from all users"
      }
    ],
    "Pack Management": [
      {
        "endpoint": "GET /api/packs",
        "description": "Get user's owned physical packs",
        "authentication": "Required",
        "returns": "Array of user's unopened packs"
      },
      {
        "endpoint": "POST /api/packs/open/:packId",
        "description": "Open a physical pack",
        "authentication": "Required",
        "parameters": "packId: pack to open",
        "returns": "Cards received from pack"
      }
    ],
    "Notifications": [
      {
        "endpoint": "GET /api/notifications",
        "description": "Get user notifications",
        "authentication": "Required",
        "returns": "Array of user notifications"
      },
      {
        "endpoint": "PATCH /api/notifications/:id/read",
        "description": "Mark notification as read",
        "authentication": "Required",
        "parameters": "id: notification ID",
        "returns": "Success confirmation"
      }
    ],
    "Shipping": [
      {
        "endpoint": "POST /api/shipping/request",
        "description": "Request physical card shipping",
        "authentication": "Required",
        "parameters": "Shipping address and card selection",
        "returns": "Shipping request confirmation"
      }
    ]
  },
  "Admin Functions": {
    "System Management": [
      {
        "endpoint": "GET /api/admin/stats",
        "description": "Get system statistics",
        "authentication": "Admin only",
        "returns": "User count, card stats, transaction totals"
      },
      {
        "endpoint": "GET /api/admin/users",
        "description": "Get all users for management",
        "authentication": "Admin only", 
        "returns": "Array of all user accounts"
      }
    ],
    "Card Administration": [
      {
        "endpoint": "GET /api/admin/cards",
        "description": "Get all cards in the system",
        "authentication": "Admin only",
        "returns": "Array of all cards"
      },
      {
        "endpoint": "POST /api/admin/cards",
        "description": "Create a new card",
        "authentication": "Admin only",
        "parameters": "Card data (name, tier, imageUrl, etc.)",
        "returns": "Created card object"
      },
      {
        "endpoint": "PATCH /api/admin/cards/:id",
        "description": "Update existing card",
        "authentication": "Admin only",
        "parameters": "Card ID and updated fields",
        "returns": "Updated card object"
      },
      {
        "endpoint": "PATCH /api/admin/cards/:id/stock",
        "description": "Update card stock quantity",
        "authentication": "Admin only",
        "parameters": "Card ID and new stock amount",
        "returns": "Success confirmation"
      },
      {
        "endpoint": "DELETE /api/admin/cards/:id",
        "description": "Delete a card",
        "authentication": "Admin only",
        "parameters": "Card ID to delete",
        "returns": "Success confirmation"
      }
    ],
    "Pull Rate Management": [
      {
        "endpoint": "GET /api/admin/pull-rates",
        "description": "Get all pull rates for all pack types",
        "authentication": "Admin only",
        "returns": "Array of pack pull rate configurations"
      },
      {
        "endpoint": "GET /api/admin/pull-rates/:packType",
        "description": "Get pull rates for specific pack type",
        "authentication": "Admin only",
        "parameters": "packType: pack type to get rates for",
        "returns": "Pull rates for the specified pack"
      },
      {
        "endpoint": "POST /api/admin/pull-rates/:packType",
        "description": "Set pull rates for a pack type",
        "authentication": "Admin only",
        "parameters": "packType and rates array (must sum to 100%)",
        "returns": "Success confirmation"
      }
    ],
    "Virtual Library Management": [
      {
        "endpoint": "GET /api/admin/virtual-library",
        "description": "Get all virtual library cards",
        "authentication": "Admin only",
        "returns": "Array of virtual library cards"
      },
      {
        "endpoint": "POST /api/admin/virtual-library",
        "description": "Create virtual library card",
        "authentication": "Admin only",
        "parameters": "Card data for virtual library",
        "returns": "Created virtual library card"
      },
      {
        "endpoint": "PATCH /api/admin/virtual-library/:id",
        "description": "Update virtual library card",
        "authentication": "Admin only",
        "parameters": "Card ID and updated fields",
        "returns": "Updated virtual library card"
      },
      {
        "endpoint": "DELETE /api/admin/virtual-library/:id",
        "description": "Delete virtual library card",
        "authentication": "Admin only",
        "parameters": "Card ID to delete",
        "returns": "Success confirmation"
      }
    ],
    "Virtual Pack Administration": [
      {
        "endpoint": "GET /api/admin/virtual-packs",
        "description": "Get all virtual packs for management",
        "authentication": "Admin only",
        "returns": "Array of virtual packs with configuration"
      },
      {
        "endpoint": "POST /api/admin/virtual-packs",
        "description": "Create new virtual pack",
        "authentication": "Admin only",
        "parameters": "Pack data (name, price, description, etc.)",
        "returns": "Created virtual pack"
      },
      {
        "endpoint": "PATCH /api/admin/virtual-packs/:id",
        "description": "Update virtual pack configuration",
        "authentication": "Admin only",
        "parameters": "Pack ID and updated fields",
        "returns": "Updated virtual pack"
      },
      {
        "endpoint": "DELETE /api/admin/virtual-packs/:id",
        "description": "Deactivate virtual pack",
        "authentication": "Admin only",
        "parameters": "Pack ID to deactivate",
        "returns": "Success confirmation"
      }
    ],
    "Content Management": [
      {
        "endpoint": "GET /api/admin/virtual-packs/:id/cards",
        "description": "Get cards assigned to virtual pack",
        "authentication": "Admin only",
        "parameters": "Virtual pack ID",
        "returns": "Cards assigned to the pack"
      },
      {
        "endpoint": "POST /api/admin/virtual-packs/:id/cards",
        "description": "Assign cards to virtual pack",
        "authentication": "Admin only",
        "parameters": "Pack ID, card IDs, and weights",
        "returns": "Success confirmation"
      },
      {
        "endpoint": "GET /api/admin/virtual-packs/:id/pull-rates",
        "description": "Get pull rates for virtual pack",
        "authentication": "Admin only",
        "parameters": "Virtual pack ID",
        "returns": "Tier-based pull rate configuration"
      },
      {
        "endpoint": "POST /api/admin/virtual-packs/:id/pull-rates",
        "description": "Set pull rates for virtual pack",
        "authentication": "Admin only",
        "parameters": "Pack ID and tier probabilities (must sum to 100%)",
        "returns": "Success confirmation"
      }
    ]
  },
  "Frontend Components": {
    "Game Components": [
      {
        "component": "PlinkoGame",
        "description": "Interactive Plinko physics game with ball simulation",
        "features": "Ball physics, pin collisions, bucket outcomes, pokeball rewards"
      },
      {
        "component": "WheelGame", 
        "description": "Wheel of Fortune style spinning game",
        "features": "Spinning animation, weighted outcomes, pack rewards"
      },
      {
        "component": "VirtualPackOpening",
        "description": "Virtual pack opening with card reveal animations",
        "features": "Sequential card reveals, tier-based outcomes, hit card mechanic"
      },
      {
        "component": "PackOpening",
        "description": "Physical pack opening interface",
        "features": "Card animations, rarity reveals, collection updates"
      }
    ],
    "UI Components": [
      {
        "component": "Navigation",
        "description": "Main app navigation with authentication-aware routing",
        "features": "Responsive menu, login/logout, admin access"
      },
      {
        "component": "GlobalFeed",
        "description": "Real-time feed of card pulls from all users",
        "features": "Live updates, tier filtering, user highlights"
      },
      {
        "component": "CreditPurchase",
        "description": "Credit purchasing interface with bundle options",
        "features": "Bundle bonuses, payment processing, instant credit addition"
      },
      {
        "component": "CardDisplay",
        "description": "Individual card display with tier styling",
        "features": "Tier-based colors, rarity effects, market values"
      }
    ],
    "Management Interfaces": [
      {
        "component": "VirtualPackStore",
        "description": "Store interface for purchasing virtual packs",
        "features": "Pack previews, credit validation, purchase flow"
      },
      {
        "component": "RecentPullsCarousel",
        "description": "Carousel showing recent card pulls",
        "features": "Auto-scrolling, card highlights, tier displays"
      }
    ]
  },
  "Game Mechanics": {
    "Tier System": [
      {
        "tier": "D",
        "description": "Common cards - most frequent drops",
        "probability": "~65% in most packs"
      },
      {
        "tier": "C", 
        "description": "Uncommon cards - moderate rarity",
        "probability": "~15% in most packs"
      },
      {
        "tier": "B",
        "description": "Rare cards - less common drops",
        "probability": "~8% in most packs"
      },
      {
        "tier": "A",
        "description": "Super rare cards - valuable drops",
        "probability": "~2% in most packs"
      },
      {
        "tier": "S",
        "description": "Legendary cards - very rare",
        "probability": "~1.5% in most packs"
      },
      {
        "tier": "SS",
        "description": "Ultra legendary cards - extremely rare",
        "probability": "~0.14% in most packs"
      },
      {
        "tier": "SSS",
        "description": "Mythic cards - rarest tier",
        "probability": "~0.01% in most packs"
      }
    ],
    "Pack Types": [
      {
        "type": "Pokeball Pack",
        "cost": "From Plinko/Wheel games",
        "description": "Basic pack with standard card distribution"
      },
      {
        "type": "Greatball Pack",
        "cost": "From Plinko/Wheel games", 
        "description": "Improved pack with better rare card chances"
      },
      {
        "type": "Ultraball Pack",
        "cost": "From Plinko/Wheel games",
        "description": "Premium pack with enhanced legendary rates"
      },
      {
        "type": "Masterball Pack",
        "cost": "From Plinko/Wheel games",
        "description": "Ultimate pack with highest tier probabilities"
      },
      {
        "type": "Black Bolt Virtual Pack",
        "cost": "16 credits direct purchase",
        "description": "Themed pack with 8 cards (7 commons + 1 hit card)"
      }
    ]
  },
  "Gaming Costs": [
    {
      "game": "Plinko Drop",
      "cost": "20 credits",
      "description": "Physics-based ball drop game with pokeball pack rewards"
    },
    {
      "game": "Wheel Spin",
      "cost": "20 credits", 
      "description": "Spinning wheel game with weighted pack outcomes"
    },
    {
      "game": "Classic Packs (Black Bolt)",
      "cost": "16 credits",
      "description": "Direct virtual pack purchase with guaranteed 8 cards"
    }
  ]
};

async function generatePDF() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Drops TCG - Function Documentation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        h1 {
          color: #1a202c;
          border-bottom: 3px solid #4299e1;
          padding-bottom: 10px;
          margin-bottom: 30px;
        }
        h2 {
          color: #2d3748;
          margin-top: 40px;
          margin-bottom: 20px;
          font-size: 1.5em;
        }
        h3 {
          color: #4a5568;
          margin-top: 30px;
          margin-bottom: 15px;
          font-size: 1.2em;
        }
        .endpoint {
          background: #f7fafc;
          border-left: 4px solid #4299e1;
          padding: 15px;
          margin: 15px 0;
          border-radius: 0 8px 8px 0;
        }
        .endpoint-title {
          font-family: 'Courier New', monospace;
          font-weight: bold;
          color: #2b6cb0;
          margin-bottom: 8px;
        }
        .description {
          margin-bottom: 8px;
        }
        .params {
          color: #718096;
          font-size: 0.9em;
        }
        .tier {
          background: #edf2f7;
          border-left: 4px solid #9f7aea;
          padding: 10px;
          margin: 10px 0;
          border-radius: 0 6px 6px 0;
        }
        .tier-name {
          font-weight: bold;
          color: #553c9a;
        }
        .cost-item {
          background: #f0fff4;
          border-left: 4px solid #48bb78;
          padding: 10px;
          margin: 10px 0;
          border-radius: 0 6px 6px 0;
        }
        .cost-name {
          font-weight: bold;
          color: #2f855a;
        }
        .component {
          background: #fffaf0;
          border-left: 4px solid #ed8936;
          padding: 10px;
          margin: 10px 0;
          border-radius: 0 6px 6px 0;
        }
        .component-name {
          font-weight: bold;
          color: #c05621;
        }
        .date {
          text-align: right;
          color: #718096;
          font-size: 0.9em;
          margin-top: 40px;
        }
      </style>
    </head>
    <body>
      <h1>🎮 Drops Trading Card Game - Function Documentation</h1>
      
      <h2>📊 System Overview</h2>
      <p>Drops is a modern trading card game application featuring physics-based games, virtual pack opening, and comprehensive card collection management.</p>
      
      <h2>🔌 API Endpoints</h2>
      
      ${Object.entries(functionDocumentation["API Endpoints"]).map(([category, endpoints]) => `
        <h3>${category}</h3>
        ${endpoints.map(endpoint => `
          <div class="endpoint">
            <div class="endpoint-title">${endpoint.endpoint}</div>
            <div class="description">${endpoint.description}</div>
            ${endpoint.authentication ? `<div class="params"><strong>Auth:</strong> ${endpoint.authentication}</div>` : ''}
            ${endpoint.parameters ? `<div class="params"><strong>Parameters:</strong> ${endpoint.parameters}</div>` : ''}
            ${endpoint.returns ? `<div class="params"><strong>Returns:</strong> ${endpoint.returns}</div>` : ''}
          </div>
        `).join('')}
      `).join('')}
      
      <h2>🎲 Game Mechanics</h2>
      
      <h3>💎 Card Tier System</h3>
      ${functionDocumentation["Game Mechanics"]["Tier System"].map(tier => `
        <div class="tier">
          <div class="tier-name">Tier ${tier.tier}</div>
          <div class="description">${tier.description}</div>
          <div class="params">${tier.probability}</div>
        </div>
      `).join('')}
      
      <h3>📦 Pack Types</h3>
      ${functionDocumentation["Game Mechanics"]["Pack Types"].map(pack => `
        <div class="tier">
          <div class="tier-name">${pack.type}</div>
          <div class="description">${pack.description}</div>
          <div class="params"><strong>Cost:</strong> ${pack.cost}</div>
        </div>
      `).join('')}
      
      <h2>💰 Game Costs</h2>
      ${functionDocumentation["Gaming Costs"].map(game => `
        <div class="cost-item">
          <div class="cost-name">${game.game} - ${game.cost}</div>
          <div class="description">${game.description}</div>
        </div>
      `).join('')}
      
      <h2>⚛️ Frontend Components</h2>
      
      ${Object.entries(functionDocumentation["Frontend Components"]).map(([category, components]) => `
        <h3>${category}</h3>
        ${components.map(comp => `
          <div class="component">
            <div class="component-name">${comp.component}</div>
            <div class="description">${comp.description}</div>
            <div class="params"><strong>Features:</strong> ${comp.features}</div>
          </div>
        `).join('')}
      `).join('')}
      
      <h2>🔧 Admin Functions</h2>
      
      ${Object.entries(functionDocumentation["Admin Functions"]).map(([category, endpoints]) => `
        <h3>${category}</h3>
        ${endpoints.map(endpoint => `
          <div class="endpoint">
            <div class="endpoint-title">${endpoint.endpoint}</div>
            <div class="description">${endpoint.description}</div>
            <div class="params"><strong>Auth:</strong> ${endpoint.authentication}</div>
            ${endpoint.parameters ? `<div class="params"><strong>Parameters:</strong> ${endpoint.parameters}</div>` : ''}
            ${endpoint.returns ? `<div class="params"><strong>Returns:</strong> ${endpoint.returns}</div>` : ''}
          </div>
        `).join('')}
      `).join('')}
      
      <div class="date">
        Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
      </div>
    </body>
    </html>
  `;
  
  await page.setContent(htmlContent);
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '1in',
      right: '0.5in',
      bottom: '1in',
      left: '0.5in'
    }
  });
  
  await browser.close();
  
  return pdf;
}

// Generate and save the PDF
try {
  const pdfBuffer = await generatePDF();
  const fs = await import('fs');
  fs.writeFileSync('drops-functions-documentation.pdf', pdfBuffer);
  console.log('✅ PDF generated successfully: drops-functions-documentation.pdf');
} catch (error) {
  console.error('❌ Error generating PDF:', error);
}