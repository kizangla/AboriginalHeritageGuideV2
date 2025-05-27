import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Territory, Business } from '@shared/schema';

interface InfoPanelProps {
  selectedTerritory: Territory | null;
  onShowModal: () => void;
}

export default function InfoPanel({ selectedTerritory, onShowModal }: InfoPanelProps) {
  const { data: businesses } = useQuery({
    queryKey: ['/api/territories', selectedTerritory?.id, 'businesses'],
    enabled: !!selectedTerritory,
  });

  if (!selectedTerritory) {
    return (
      <Card className="info-panel absolute top-5 right-5 z-[1000] max-w-[350px] bg-earth-beige/95 backdrop-blur-sm border-earth-brown/20 shadow-lg">
        <div className="p-5">
          <h3 className="font-serif font-bold text-earth-brown mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-earth-gold" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            </svg>
            Territory Information
          </h3>
          
          <div className="text-center py-8 text-earth-dark/60">
            <img 
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
              alt="Australian landscape with rolling hills" 
              className="rounded-lg mb-4 w-full h-32 object-cover"
            />
            <svg className="w-12 h-12 mx-auto mb-2 text-earth-peru" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M6,20H15L6,4V20Z"/>
            </svg>
            <p className="font-semibold">Click on a territory</p>
            <p className="text-sm">to learn about Aboriginal groups and their connection to country</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="info-panel absolute top-5 right-5 z-[1000] max-w-[350px] bg-earth-beige/95 backdrop-blur-sm border-earth-brown/20 shadow-lg">
      <div className="p-5">
        <h3 className="font-serif font-bold text-earth-brown mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-earth-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
          </svg>
          Territory Information
        </h3>
        
        <div className="space-y-4">
          <div className="territory-info bg-earth-beige/90 rounded-lg p-4 border-l-4 border-earth-brown">
            <h4 className="font-serif font-bold text-earth-brown mb-2 flex items-center">
              <div 
                className="w-4 h-4 rounded mr-2" 
                style={{ backgroundColor: selectedTerritory.color }}
              ></div>
              {selectedTerritory.name}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">Aboriginal Group:</span>
                <span>{selectedTerritory.groupName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Language:</span>
                <span>{selectedTerritory.languageFamily}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Region:</span>
                <span>{selectedTerritory.region}</span>
              </div>
              {selectedTerritory.estimatedPopulation && (
                <div className="flex justify-between">
                  <span className="font-semibold">Est. Population:</span>
                  <span>{selectedTerritory.estimatedPopulation.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Show a preview of businesses if available */}
          {businesses && businesses.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-semibold text-earth-brown text-sm">Local Businesses</h5>
              <div className="text-xs text-earth-dark/70">
                {businesses.length} business{businesses.length !== 1 ? 'es' : ''} found
              </div>
            </div>
          )}

          <Button 
            onClick={onShowModal}
            className="w-full bg-earth-brown hover:bg-earth-brown/90 text-white"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            </svg>
            View Detailed Information
          </Button>
        </div>
      </div>
    </Card>
  );
}
