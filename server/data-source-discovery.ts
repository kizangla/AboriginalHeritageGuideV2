/**
 * Data Source Discovery Service
 * Identifies and catalogs potential Indigenous-related datasets from government sources
 */

export interface DataSource {
  id: string;
  name: string;
  description: string;
  type: 'heritage' | 'land_use' | 'cultural' | 'environmental' | 'economic';
  format: 'wfs' | 'wms' | 'geojson' | 'shapefile' | 'csv';
  url: string;
  authority: string;
  coverage: 'national' | 'state' | 'regional';
  indigenousRelevance: 'high' | 'medium' | 'low';
  implementationStatus: 'planned' | 'in_progress' | 'complete';
  dataQuality: 'verified' | 'unverified';
}

// High-priority Indigenous-related data sources for implementation
export const PRIORITY_DATA_SOURCES: DataSource[] = [
  // Western Australia - DMIRS Sources
  {
    id: 'wa_aboriginal_heritage_sites',
    name: 'WA Aboriginal Heritage Sites',
    description: 'Protected Aboriginal heritage sites and sacred places in Western Australia',
    type: 'heritage',
    format: 'wfs',
    url: 'https://services.slip.wa.gov.au/public/services/SLIP_Public_Services/Heritage/MapServer/WFSServer',
    authority: 'WA Department of Planning, Lands and Heritage',
    coverage: 'state',
    indigenousRelevance: 'high',
    implementationStatus: 'planned',
    dataQuality: 'verified'
  },
  {
    id: 'wa_native_title_applications',
    name: 'WA Native Title Applications and Determinations',
    description: 'Current and historical native title applications and determinations in WA',
    type: 'land_use',
    format: 'wfs',
    url: 'https://services.slip.wa.gov.au/public/services/SLIP_Public_Services/Land_Administration/MapServer/WFSServer',
    authority: 'WA Department of Planning, Lands and Heritage',
    coverage: 'state',
    indigenousRelevance: 'high',
    implementationStatus: 'planned',
    dataQuality: 'verified'
  },
  
  // Federal Sources
  {
    id: 'abs_indigenous_regions',
    name: 'ABS Indigenous Regions (IREG)',
    description: 'Australian Bureau of Statistics Indigenous geographical classification',
    type: 'cultural',
    format: 'wfs',
    url: 'https://geo.abs.gov.au/arcgis/services/ASGS2021/IREG/MapServer/WFSServer',
    authority: 'Australian Bureau of Statistics',
    coverage: 'national',
    indigenousRelevance: 'high',
    implementationStatus: 'planned',
    dataQuality: 'verified'
  },
  {
    id: 'aiatsis_language_boundaries',
    name: 'AIATSIS Indigenous Language Boundaries',
    description: 'Traditional Indigenous language group boundaries across Australia',
    type: 'cultural',
    format: 'wfs',
    url: 'https://data.gov.au/geoserver/aiatsis-language-groups/wfs',
    authority: 'Australian Institute of Aboriginal and Torres Strait Islander Studies',
    coverage: 'national',
    indigenousRelevance: 'high',
    implementationStatus: 'planned',
    dataQuality: 'verified'
  },
  {
    id: 'federal_court_native_title',
    name: 'Federal Court Native Title Documents',
    description: 'Court documents, determinations, and legal boundaries from Federal Court',
    type: 'land_use',
    format: 'geojson',
    url: 'https://www.fedcourt.gov.au/services/access-to-files-and-transcripts/online-files/native-title',
    authority: 'Federal Court of Australia',
    coverage: 'national',
    indigenousRelevance: 'high',
    implementationStatus: 'planned',
    dataQuality: 'verified'
  },
  
  // Environmental and Cultural Heritage
  {
    id: 'environment_heritage_places',
    name: 'Australian Heritage Places Inventory',
    description: 'National and state heritage places including Indigenous cultural sites',
    type: 'heritage',
    format: 'wfs',
    url: 'https://www.environment.gov.au/webgis-framework/services/ahpi/wfs',
    authority: 'Department of Climate Change, Energy, Environment and Water',
    coverage: 'national',
    indigenousRelevance: 'medium',
    implementationStatus: 'planned',
    dataQuality: 'verified'
  },
  {
    id: 'indigenous_protected_areas',
    name: 'Indigenous Protected Areas (IPA)',
    description: 'Indigenous-managed conservation areas across Australia',
    type: 'environmental',
    format: 'wfs',
    url: 'https://www.environment.gov.au/webgis-framework/services/ipa/wfs',
    authority: 'Department of Climate Change, Energy, Environment and Water',
    coverage: 'national',
    indigenousRelevance: 'high',
    implementationStatus: 'planned',
    dataQuality: 'verified'
  },
  
  // Economic Development
  {
    id: 'indigenous_business_directory',
    name: 'Indigenous Business Australia Directory',
    description: 'Directory of Indigenous-owned businesses and corporations',
    type: 'economic',
    format: 'csv',
    url: 'https://www.iba.gov.au/business-solutions/business-directory',
    authority: 'Indigenous Business Australia',
    coverage: 'national',
    indigenousRelevance: 'high',
    implementationStatus: 'planned',
    dataQuality: 'verified'
  }
];

// State-specific data sources for comprehensive coverage
export const STATE_DATA_SOURCES = {
  NSW: [
    {
      id: 'nsw_aboriginal_heritage',
      name: 'NSW Aboriginal Heritage Information Management System',
      description: 'Aboriginal sites and places in NSW',
      url: 'https://www.heritage.nsw.gov.au/search-for-heritage/aboriginal-heritage-information-management-system/',
      authority: 'Heritage NSW'
    }
  ],
  VIC: [
    {
      id: 'vic_aboriginal_heritage',
      name: 'Victorian Aboriginal Heritage Register',
      description: 'Registered Aboriginal heritage places in Victoria',
      url: 'https://www.aboriginalheritageregister.vic.gov.au/',
      authority: 'First Peoples - State Relations'
    }
  ],
  QLD: [
    {
      id: 'qld_cultural_heritage',
      name: 'Queensland Cultural Heritage Database',
      description: 'Aboriginal and Torres Strait Islander cultural heritage sites',
      url: 'https://www.datsip.qld.gov.au/people-communities/cultural-heritage',
      authority: 'Department of Seniors, Disability Services and Aboriginal and Torres Strait Islander Partnerships'
    }
  ]
};

export function getImplementationPriority(): DataSource[] {
  return PRIORITY_DATA_SOURCES
    .filter(source => source.indigenousRelevance === 'high')
    .sort((a, b) => {
      // Prioritize by coverage (national first) and type
      if (a.coverage === 'national' && b.coverage !== 'national') return -1;
      if (b.coverage === 'national' && a.coverage !== 'national') return 1;
      
      const typeOrder = { heritage: 1, cultural: 2, land_use: 3, environmental: 4, economic: 5 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
}