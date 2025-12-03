# Indigenous Australia Interactive Map Platform

## Overview

This project is a comprehensive geospatial web application that visualizes Aboriginal Australian territories alongside authentic government data sources. The platform integrates multiple data streams including Native Title determinations, RATSIB boundaries, Indigenous language territories, and mining tenement information to provide an authoritative mapping resource for cultural preservation, land rights analysis, and consultation processes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Mapping**: Leaflet.js for interactive map rendering with GeoJSON support
- **UI Components**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM (via Neon serverless)
- **Data Sources**: Integration with multiple Australian Government APIs and datasets
- **Caching**: In-memory caching with intelligent geographic indexing

## Key Components

### Data Integration Services
1. **Aboriginal Territory Data**: Core GeoJSON territories with cultural information
2. **Native Title Service**: Australian Government Native Title Tribunal data
3. **RATSIB Service**: Regional Aboriginal and Torres Strait Islander Bodies boundaries (NNTT ArcGIS)
4. **Mining Tenements**: WA DMIRS mining lease and exploration data (ArcGIS REST API)
5. **MINEDEX Service**: WA mines and mineral deposits database - site types (Mine, Deposit, Prospect), commodities, operating stages
6. **Exploration Reports**: WA DMIRS exploration and mineral reports
7. **Business Directory**: ABR (Australian Business Register) integration with Indigenous business verification
8. **Cultural Data**: AIATSIS language boundaries and heritage sites
9. **Place Names**: Geoscience Australia Gazetteer for geographic naming

### National Mining Data Services (All States)
10. **Geoscience Australia**: National critical minerals deposits (381+ deposits) - primary nationwide data source
11. **Northern Territory STRIKE**: NT mineral tenements via WFS endpoint
12. **South Australia SARIG**: SA mineral tenements (service framework in place)
13. **Queensland GSQ**: QLD exploration reports via CKAN API (service framework in place)
14. **NSW MinView**: NSW mining titles via WFS (service framework in place)
15. **Victoria GeoVic**: VIC mineral sites via WFS (service framework in place)
16. **Tasmania MRT**: TAS mining leases via ArcGIS REST (service framework in place)

### Geographic Services
- **Geocoding**: Address-to-coordinate conversion for business locations
- **Spatial Analysis**: Territory boundary intersections and overlap detection
- **Data Optimization**: Viewport-based data loading and caching
- **Real-time Updates**: Dynamic overlay management based on map interactions

### Authentication & Verification
- **Supply Nation Integration**: Indigenous business verification (credentials required)
- **Pattern Recognition**: Indigenous business identification through name/location analysis
- **Data Provenance**: Source attribution and data quality indicators

## Data Flow

1. **Initial Load**: Static Aboriginal territory GeoJSON serves as base layer
2. **Dynamic Overlays**: Government data loaded on-demand based on map viewport
3. **User Interactions**: Click events trigger detailed territory information panels
4. **Search Integration**: Address geocoding connects to territory lookup
5. **Business Directory**: ABR searches enhanced with Indigenous verification
6. **Caching Strategy**: Geographic regions cached to optimize repeated requests

## External Dependencies

### Government Data Sources
- Australian Government Native Title Tribunal (WFS endpoints)
- WA Department of Mines, Industry Regulation and Safety (DMIRS)
- Australian Bureau of Statistics (ABS) Indigenous regions
- Australian Institute of Aboriginal and Torres Strait Islander Studies (AIATSIS)
- Geoscience Australia place names database

### Third-Party Services
- Google Maps API (geocoding - requires API key)
- Supply Nation business directory (requires credentials)
- Australian Business Register (ABR) - public access

### Infrastructure
- Neon PostgreSQL database (serverless)
- Replit hosting platform
- CDN for static assets (Leaflet, fonts)

## Deployment Strategy

### Development Environment
- Replit-based development with hot reload
- Vite dev server for frontend assets
- Direct database connections for development

### Production Configuration
- Build pipeline: Vite frontend build + esbuild backend compilation
- Database migrations via Drizzle Kit
- Environment variables for API keys and database connections
- Static asset serving through Express

### Scalability Considerations
- Geographic data caching to reduce API calls
- Lazy loading of large datasets (mining tenements, Native Title applications)  
- Viewport-based data requests to minimize payload sizes
- Connection pooling for database efficiency

### Data Management
- Automated imports for government datasets
- Cache invalidation strategies for real-time data
- Error handling for external API failures
- Fallback data sources when primary endpoints are unavailable

The application prioritizes authentic government data sources while providing fallback mechanisms and clear data provenance indicators to ensure users understand the source and reliability of displayed information.