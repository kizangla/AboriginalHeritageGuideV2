# Indigenous Australia Interactive Map Platform

An interactive geospatial web application that visualizes Aboriginal Australian territories alongside authentic government data sources. This platform integrates multiple data streams including Native Title determinations, RATSIB boundaries, Indigenous language territories, and mining tenement information to provide an authoritative mapping resource for cultural preservation, land rights analysis, and consultation processes.

![Aboriginal Territories Map](https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400)

## 🌟 Features

### Core Mapping Features
- **626 Aboriginal Territories**: Complete visualization of traditional Indigenous territories across Australia
- **Interactive Territory Information**: Click any territory to view detailed cultural, linguistic, and demographic information
- **Native Title Boundaries**: Government data on recognized Indigenous land rights
- **RATSIB Regions**: Regional Aboriginal and Torres Strait Islander Bodies boundaries
- **Mining Tenements**: Real-time WA DMIRS mining lease and exploration data
- **Indigenous Business Directory**: Integration with Australian Business Register for Indigenous-owned businesses

### Advanced Features (Recently Added)
- **🔍 Smart Search**: Autocomplete search for territories, places, and businesses with keyboard navigation
- **🎯 Advanced Mining Filters**: Filter by tenement type, status, minerals, companies, area range, and dates
- **🔄 Data Freshness Indicators**: Real-time tracking showing when each data layer was last updated
- **💾 Save & Share Views**: Save custom map configurations and share via URL
- **📱 Mobile Optimized**: Touch controls, responsive design, and mobile-specific UI components
- **🎨 Layer Control**: Toggle map layers with opacity controls and quick presets

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Lightning-fast build tool
- **Leaflet.js** - Interactive mapping library
- **TanStack Query** - Server state management
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality UI components
- **Wouter** - Lightweight routing

### Backend
- **Node.js** with Express
- **PostgreSQL** (Neon serverless)
- **Drizzle ORM** - Type-safe database queries
- **TypeScript** - End-to-end type safety

### Data Sources
- Australian Government Native Title Tribunal
- WA Department of Mines (DMIRS)
- Australian Bureau of Statistics (ABS)
- AIATSIS (Australian Institute of Aboriginal and Torres Strait Islander Studies)
- Geoscience Australia

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or use Neon serverless)
- Google Maps API key (for geocoding)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/indigenous-australia-map.git
cd indigenous-australia-map
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create a .env file with:
DATABASE_URL=your_postgresql_connection_string
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

4. Initialize the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📖 Usage Guide

### Basic Navigation
1. **Click territories** to view detailed cultural information
2. **Use the search bar** to find specific territories or locations
3. **Toggle layers** using the layer control panel
4. **Apply filters** to mining data for detailed analysis

### Mobile Features
- **Pinch to zoom** on touch devices
- **Tap territories** for information
- **Bottom drawer** for map controls
- **Touch-optimized** UI elements

### Saving and Sharing Views
1. Configure your desired map view (zoom, layers, filters)
2. Click "Save View" and give it a name
3. Use "Share" to generate a URL for the current view
4. Access saved views from the dropdown menu

## 🔌 API Endpoints

### Territory Data
- `GET /api/territories` - All Aboriginal territories (GeoJSON)
- `GET /api/territory/:name` - Specific territory details

### Government Data
- `GET /api/native-title` - Native Title determinations
- `GET /api/ratsib/all-boundaries` - RATSIB boundaries
- `GET /api/mining/search` - Mining tenements with filters

### Utilities
- `GET /api/data-freshness` - Last update times for all data sources
- `GET /api/saved-views` - User's saved map configurations

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Respect Indigenous cultural sensitivities in all contributions

## 📊 Data Sources & Attribution

This application uses official government data sources:
- **Native Title Data**: © Commonwealth of Australia (Native Title Tribunal)
- **DMIRS Mining Data**: © Government of Western Australia
- **AIATSIS Language Data**: © Australian Institute of Aboriginal and Torres Strait Islander Studies
- **Territory Boundaries**: Compiled from multiple authoritative sources

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

We acknowledge the Traditional Custodians of the lands displayed in this application and pay our respects to Elders past, present, and emerging. This tool is intended to support understanding and respect for Indigenous Australian cultures and land rights.

## 📧 Contact & Support

For questions, suggestions, or support:
- Open an issue on GitHub
- Contact the development team

## 🚦 Status

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

**Note**: This application requires active internet connection for real-time government data feeds. Some features may be limited without proper API keys.