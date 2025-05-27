import { useState } from 'react';
import SimpleMap from '@/components/map/SimpleMap';
import SearchPanel from '@/components/map/SearchPanel';
import InfoPanel from '@/components/map/InfoPanel';
import ControlPanel from '@/components/map/ControlPanel';
import TerritoryModal from '@/components/map/TerritoryModal';
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
    <div className="min-h-screen bg-earth-beige">
      {/* Header */}
      <header className="bg-earth-brown text-white shadow-lg relative overflow-hidden">
        <div className="cultural-pattern absolute inset-0 opacity-30"></div>
        <div className="container mx-auto px-6 py-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <svg className="w-8 h-8 text-earth-gold" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                <path d="M12 8L12.5 10.5L15 11L12.5 11.5L12 14L11.5 11.5L9 11L11.5 10.5L12 8Z"/>
              </svg>
              <h1 className="text-2xl font-serif font-bold">Aboriginal Australia Interactive Map</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-earth-gold text-earth-dark px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors font-semibold">
                <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9Z"/>
                </svg>
                About
              </button>
              <button className="bg-earth-peru text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-semibold">
                <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM5 19V5H19V19H5Z"/>
                </svg>
                Resources
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        <SimpleMap 
          onMapReady={setMapInstance}
        />
        
        <SearchPanel onSearch={handleSearch} />
        
        <InfoPanel 
          selectedTerritory={selectedTerritory}
          onShowModal={handleShowModal}
        />
        
        <ControlPanel 
          onResetView={handleResetView}
        />

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
