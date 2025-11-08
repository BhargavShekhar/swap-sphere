# Swap Sphere - Project Structure

## Overview

Swap Sphere is a peer-to-peer skill-matching and exchange platform built as a Turborepo monorepo.

## Project Structure

```
swap-sphere/
├── apps/
│   ├── matching-engine/      # Backend microservice for matching
│   ├── frontend/              # React frontend application
│   ├── backend/               # Additional backend services
│   └── whiteboard-worker/     # Whiteboard collaboration service
├── packages/                  # Shared packages
│   ├── @repo/eslint-config
│   ├── @repo/typescript-config
│   └── @repo/ui
└── turbo.json                # Turborepo configuration
```

## Apps

### matching-engine

**Purpose**: Core matching algorithm and API backend

**Structure**:
```
apps/matching-engine/
├── src/
│   ├── config/           # Database configuration
│   ├── models/           # MongoDB models (User, Exchange, Message)
│   ├── types/            # TypeScript type definitions
│   ├── services/         # Business logic
│   │   ├── semantic.service.ts
│   │   ├── language.service.ts
│   │   └── trust.service.ts
│   ├── core/             # Core matching engine
│   │   └── matching.engine.ts
│   ├── middleware/       # Express middleware
│   │   └── auth.middleware.ts
│   └── routes/           # API routes
│       ├── auth.route.ts
│       ├── profile.route.ts
│       ├── matching.route.ts
│       ├── exchange.route.ts
│       └── message.route.ts
├── dist/                 # Compiled JavaScript (gitignored)
├── .env                  # Environment variables (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

**Key Features**:
- Intelligent matching algorithm with semantic similarity
- MongoDB integration for persistent storage
- JWT authentication
- Exchange and message management
- Trust score system

### frontend

**Purpose**: React-based user interface

**Structure**:
```
apps/frontend/
├── src/
│   ├── components/       # React components
│   │   ├── matching/     # Matching-related components
│   │   ├── Home.tsx
│   │   ├── VidioCall.tsx
│   │   └── WhiteBoard.tsx
│   ├── pages/            # Page components
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   └── MatchingDashboard.tsx
│   ├── contexts/         # React contexts
│   │   └── AuthContext.tsx
│   ├── services/         # API services
│   │   ├── auth.api.ts
│   │   └── matching.api.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
└── vite.config.ts
```

**Key Features**:
- User authentication (signup/login)
- Profile management (Offer & Want skills)
- Matching dashboard
- Match results display

## Technology Stack

### Backend
- **Node.js** with **Express**
- **TypeScript** for type safety
- **MongoDB** with **Mongoose** for database
- **JWT** for authentication
- **@xenova/transformers** for semantic similarity

### Frontend
- **React** with **TypeScript**
- **Vite** for build tooling
- **React Router** for routing
- **Axios** for API calls
- **Tailwind CSS** for styling

## Environment Variables

### matching-engine/.env
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
MATCHING_ENGINE_PORT=8081
```

## Development

### Start all services
```bash
pnpm run dev
```

### Start individual service
```bash
cd apps/matching-engine
pnpm run dev
```

## API Endpoints

See `apps/matching-engine/README.md` for complete API documentation.

## License

ISC

