# Matching Engine Microservice

The **Perfect Match Engine** is an intelligent skill-matching microservice that automatically matches users based on what they offer and what they want to learn.

## Features

- **Hybrid Formula-Based Matching**: Uses a sophisticated algorithm combining:
  - Semantic similarity (bidirectional)
  - Language compatibility
  - Trust scores
- **Semantic Search**: Uses transformer-based embeddings for intelligent skill matching
- **MongoDB Integration**: Persistent storage with MongoDB Atlas
- **JWT Authentication**: Secure user authentication
- **Exchange Management**: Complete learning exchange lifecycle
- **Trust Score System**: Automatic trust score updates based on reviews
- **Modular Architecture**: Easy to extend and customize
- **RESTful API**: Clean, well-documented endpoints

## Matching Algorithm

The matching engine uses a hybrid weighted formula to calculate match scores:

```
Final Match Score = (w1 × SA→B) + (w2 × SB→A) + (w3 × Llocation) + (w4 × Llanguage) + (w5 × Ttrust)
```

Where:
- **SA→B**: Semantic similarity of A's offer → B's want
- **SB→A**: Semantic similarity of B's offer → A's want
- **Llocation**: Location similarity (geographic proximity)
- **Llanguage**: Language similarity (communication compatibility)
- **Ttrust**: Trust score (reliability)

### Default Weights

- `w1`: 0.30 - SA→B (Semantic similarity A's offer → B's want)
- `w2`: 0.30 - SB→A (Semantic similarity B's offer → A's want)
- `w3`: 0.15 - Llocation (Location proximity)
- `w4`: 0.15 - Llanguage (Language compatibility)
- `w5`: 0.10 - Ttrust (Trust/reliability)

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Profile

- `POST /api/profile` - Create/update user profile (offer_skill, want_skill, skill_level)
- `GET /api/profile` - Get current user profile

### Matching

- `POST /api/matching/find` - Find matches for a user
- `POST /api/matching/score` - Calculate match score between two users
- `GET /api/matching/health` - Health check

### Exchange

- `POST /api/exchange/create` - Create a new exchange from a match
- `POST /api/exchange/:exchangeId/accept` - Accept a pending exchange
- `POST /api/exchange/:exchangeId/start` - Start an accepted exchange
- `POST /api/exchange/:exchangeId/confirm` - Confirm completion
- `POST /api/exchange/:exchangeId/review` - Submit review and rating
- `GET /api/exchange` - Get all exchanges for current user
- `GET /api/exchange/:exchangeId` - Get specific exchange

### Messages

- `POST /api/message` - Send a message in an exchange
- `GET /api/message/:exchangeId` - Get all messages for an exchange

## Development

### Prerequisites

- Node.js >= 18
- pnpm
- MongoDB Atlas account

### Installation

```bash
cd apps/matching-engine
pnpm install
```

### Environment Variables

Create a `.env` file:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-here
MATCHING_ENGINE_PORT=8081
```

### Build

```bash
pnpm run build
```

### Run

```bash
pnpm run start
```

### Development Mode

```bash
pnpm run dev
```

## Architecture

```
src/
├── config/          # Configuration (database, etc.)
├── models/          # MongoDB models (User, Exchange, Message)
├── types/           # TypeScript types and interfaces
├── services/        # Business logic services
│   ├── semantic.service.ts    # Semantic similarity calculations
│   ├── language.service.ts   # Language compatibility
│   └── trust.service.ts      # Trust score calculations
├── core/            # Core matching engine
│   └── matching.engine.ts    # Main matching algorithm
├── middleware/      # Express middleware (auth)
└── routes/          # API routes
    ├── auth.route.ts         # Authentication endpoints
    ├── profile.route.ts      # Profile management
    ├── matching.route.ts     # Matching endpoints
    ├── exchange.route.ts    # Exchange management
    └── message.route.ts     # Chat messages
```

## License

ISC
