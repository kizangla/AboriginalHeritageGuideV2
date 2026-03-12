import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Territory } from '@shared/schema';
import type L from 'leaflet';

export interface NativeTitleStatusFilter {
  determined: boolean;
  pending: boolean;
  exists: boolean;
  doesNotExist: boolean;
  partialArea: boolean;
  entireArea: boolean;
  discontinued: boolean;
  dismissed: boolean;
}

export interface LayerVisibility {
  ratsib: boolean;
  mining: boolean;
  exploration: boolean;
}

interface MapContextValue {
  // Territory selection
  selectedTerritory: Territory | null;
  setSelectedTerritory: (t: Territory | null) => void;

  // Region filter
  selectedRegion: string | null;
  setSelectedRegion: (r: string | null) => void;

  // Native title filters
  nativeTitleFilters: NativeTitleStatusFilter;
  setNativeTitleFilters: (f: NativeTitleStatusFilter) => void;

  // Layer visibility
  layers: LayerVisibility;
  toggleLayer: (layer: keyof LayerVisibility) => void;

  // Search
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  businessSearchQuery: string;
  setBusinessSearchQuery: (q: string) => void;

  // Map instance
  mapInstance: L.Map | null;
  setMapInstance: (m: L.Map | null) => void;

  // Modal
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

const MapContext = createContext<MapContextValue | null>(null);

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within MapProvider');
  return ctx;
}

const defaultFilters: NativeTitleStatusFilter = {
  determined: false,
  pending: false,
  exists: false,
  doesNotExist: false,
  partialArea: false,
  entireArea: false,
  discontinued: false,
  dismissed: false,
};

export function MapProvider({ children }: { children: ReactNode }) {
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [nativeTitleFilters, setNativeTitleFilters] = useState<NativeTitleStatusFilter>(defaultFilters);
  const [layers, setLayers] = useState<LayerVisibility>({ ratsib: true, mining: false, exploration: false });
  const [showSearch, setShowSearch] = useState(false);
  const [businessSearchQuery, setBusinessSearchQuery] = useState('');
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [showModal, setShowModal] = useState(false);

  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const value: MapContextValue = {
    selectedTerritory, setSelectedTerritory,
    selectedRegion, setSelectedRegion,
    nativeTitleFilters, setNativeTitleFilters,
    layers, toggleLayer,
    showSearch, setShowSearch,
    businessSearchQuery, setBusinessSearchQuery,
    mapInstance, setMapInstance,
    showModal, setShowModal,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}
