import { useState } from 'react';
import SimpleMap from '@/components/map/SimpleMap';
import SearchPanel from '@/components/map/SearchPanel';
import InfoPanel from '@/components/map/InfoPanel';
import ControlPanel from '@/components/map/ControlPanel';
import TerritoryModal from '@/components/map/TerritoryModal';
import MapGuide from '@/components/map/MapGuide';
import BusinessMapLayer from '@/components/map/BusinessMapLayer';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { Link } from 'wouter';
import type { Territory } from '@shared/schema';

export default function MapPage() {
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);

  const handleTerritorySelect = (territory: Territory) => {
    setSelectedTerritory(territory);
  };

  const handleShowModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSearch = (lat: number, lng: number) => {
    if (mapInstance) {
      mapInstance.setView([lat, lng], 10);
    }
  };

  const handleResetView = () => {
    if (mapInstance) {
      mapInstance.setView([-25.2744, 133.7751], 5);
    }
  };

  return (
    <div className="h-screen w-screen bg-white">
      {/* Minimalist Header */}
      <div className="absolute top-0 left-0 right-0 z-[1010] bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
            </svg>
            <h1 className="text-lg font-medium text-gray-900">Indigenous Australia</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/business-search">
              <Button variant="outline" size="sm" className="text-sm">
                <Building2 className="w-4 h-4 mr-1" />
                Directory
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Full Screen Map */}
      <main className="h-full pt-16">
        <SimpleMap 
          onMapReady={setMapInstance}
          onTerritorySelect={handleTerritorySelect}
        />
        
        <SearchPanel onSearch={handleSearch} />
        
        <BusinessMapLayer 
          map={mapInstance}
          onBusinessSelect={(business) => {
            console.log('Selected business:', business);
          }}
        />
        
        {/* Minimalist Controls */}
        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
          <Button
            onClick={handleResetView}
            size="sm"
            variant="outline"
            className="bg-white shadow-md h-10 w-10 p-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
          </Button>
        </div>
        
        {/* Territory Info Panel - Google Maps style */}
        {selectedTerritory && (
          <div className="absolute bottom-6 left-6 z-[1000] bg-white rounded-xl shadow-lg p-4 max-w-sm">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-gray-900">{selectedTerritory.name}</h3>
              <Button
                onClick={handleShowModal}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-1">{selectedTerritory.groupName}</p>
            <p className="text-xs text-gray-500">{selectedTerritory.region}, {selectedTerritory.regionType}</p>
          </div>
        )}

        {showModal && selectedTerritory && (
          <TerritoryModal
            territory={selectedTerritory}
            onClose={handleCloseModal}
          />
        )}
      </main>
    </div>
  );
}
