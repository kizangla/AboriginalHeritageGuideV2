# Aboriginal Heritage Guide

## Project Overview
Interactive map-based application for exploring Aboriginal and Torres Strait Islander territories, indigenous businesses, native title claims, and mining tenement data across Australia.

## Tech Stack
- **Frontend:** React 18 + TypeScript, Vite, Wouter (routing), TanStack Query, Leaflet (mapping), Tailwind CSS + Radix UI + shadcn/ui, Framer Motion
- **Backend:** Express.js + TypeScript (tsx runtime), Drizzle ORM, Neon PostgreSQL (serverless)
- **External APIs:** ABR (business register), Supply Nation, Geoscience Australia, NNTT (native title), State mining departments (WA DMIRS, SA SARIG, QLD GSQ, NSW MinView, VIC GeoVic, NT STRIKE, TAS MRT), OpenAI
- **Scraping:** Puppeteer + Cheerio for Supply Nation

## Directory Structure
```
client/src/
  pages/          # map.tsx, territory.tsx, business-search.tsx, not-found.tsx
  components/     # FloatingMapControls, TerritoryInfoPanel, BusinessSearch, CollapsibleSearch
  components/map/ # SimpleMap, BusinessMapLayer, MiningOverlay, SearchPanel, UnifiedSearch (~28 files)
  components/ui/  # shadcn/ui components + GlassCard.tsx
  hooks/          # use-toast, use-mobile
  lib/            # queryClient, mapUtils, map-state-manager, data-optimization, geocoding
server/
  index.ts        # Express app, security middleware, rate limiting
  routes.ts       # ~64 API endpoints (~3200 lines)
  db.ts           # Drizzle + Neon pool
  database-storage.ts  # CRUD operations, initialization
  validation.ts   # Zod schemas + Express middleware
  *-service.ts    # ~50 service files for external data integration
shared/
  schema.ts       # Drizzle schema (8 tables), Zod types
```

## Key Commands
```bash
npm run dev          # Start dev server (tsx + Vite HMR) on port 5000
npm run build        # Vite build + esbuild server bundle
npm run start        # Production server (node dist/index.js)
npm run db:push      # Push schema changes (drizzle-kit push)
```

## Database Tables
- `territories` - Aboriginal territories with GeoJSON geometry
- `businesses` - Indigenous businesses (ABR-verified)
- `culturalSites` - Sacred sites, cultural centers
- `nativeTitleClaims` - NNTT claims with GeoJSON
- `supplyNationBusinesses` - Supply Nation verification cache
- `miningTenements` - Mining leases/licenses with GeoJSON
- `aiTerritoryContent` - AI-generated cultural content

## Routes (client)
- `/` or `/map` - Main interactive map
- `/business-search` - Business directory
- `/territory/:territoryName` - Territory detail page

## Environment Variables
- `DATABASE_URL` - Neon PostgreSQL connection string
- `CORS_ORIGIN` - Allowed CORS origin (optional)
- `SUPPLY_NATION_USERNAME` / `SUPPLY_NATION_PASSWORD`
- `GOOGLE_MAPS_API_KEY` / `MAPBOX_ACCESS_TOKEN`
- `OPENAI_API_KEY` - AI content generation

## Design System
- Glassmorphism: `.glass-subtle`, `.glass-moderate`, `.glass-strong`
- Earth tones: CSS variables `--earth-*` (terracotta, ochre, rust, sand, clay, charcoal)
- Shadows: `.shadow-premium`, `.shadow-premium-lg`, `.shadow-premium-xl`
- Animations: fadeInUp, fadeInDown, slideInRight, scaleIn, shimmer, glow

## Conventions
- Use `onKeyDown` (not deprecated `onKeyPress`) for keyboard events
- Use Zod validation middleware for new API routes (`validateQuery`, `validateParams`)
- Use Drizzle ORM's `sql` template tag for raw queries (prevents SQL injection)
- Server listens on 127.0.0.1:5000 only
- Rate limit: 100 req/min per IP on `/api/` routes
