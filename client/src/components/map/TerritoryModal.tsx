import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Territory, Business } from '@shared/schema';

interface TerritoryModalProps {
  territory: Territory;
  onClose: () => void;
}

export default function TerritoryModal({ territory, onClose }: TerritoryModalProps) {
  const { data: businesses } = useQuery({
    queryKey: ['/api/territories', territory.id, 'businesses'],
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-earth-beige">
        <DialogHeader className="cultural-pattern p-6 border-b border-earth-peru/20">
          <DialogTitle className="text-2xl font-serif font-bold text-earth-brown">
            {territory.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <img 
                src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                alt="Traditional Aboriginal art patterns" 
                className="rounded-lg shadow-md w-full h-64 object-cover mb-4" 
              />
              
              {territory.culturalInfo && (
                <Card className="territory-info bg-earth-beige/90 rounded-lg p-4 border-l-4 border-earth-brown">
                  <h4 className="font-serif font-bold text-earth-brown mb-2">Cultural Heritage</h4>
                  <p className="text-earth-dark text-sm leading-relaxed">
                    {territory.culturalInfo}
                  </p>
                </Card>
              )}
            </div>
            
            <div className="space-y-4">
              <Card className="territory-info bg-earth-beige/90 rounded-lg p-4 border-l-4 border-earth-brown">
                <h4 className="font-serif font-bold text-earth-brown mb-2">Territory Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">Group Name:</span>
                    <span>{territory.groupName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Language Family:</span>
                    <span>{territory.languageFamily}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Region Type:</span>
                    <span>{territory.regionType}</span>
                  </div>
                  {territory.estimatedPopulation && (
                    <div className="flex justify-between">
                      <span className="font-semibold">Est. Population:</span>
                      <span>{territory.estimatedPopulation.toLocaleString()}</span>
                    </div>
                  )}
                  {territory.traditionalLanguages && territory.traditionalLanguages.length > 0 && (
                    <div>
                      <span className="font-semibold">Traditional Languages:</span>
                      <div className="mt-1">
                        {territory.traditionalLanguages.map((lang, index) => (
                          <span key={index} className="inline-block bg-earth-gold/20 text-earth-brown px-2 py-1 rounded text-xs mr-1 mt-1">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {territory.historicalContext && (
                <Card className="territory-info bg-earth-beige/90 rounded-lg p-4 border-l-4 border-earth-brown">
                  <h4 className="font-serif font-bold text-earth-brown mb-2">Historical Context</h4>
                  <p className="text-earth-dark text-sm leading-relaxed">
                    {territory.historicalContext}
                  </p>
                </Card>
              )}
              
              {businesses && businesses.length > 0 && (
                <Card className="territory-info bg-earth-beige/90 rounded-lg p-4 border-l-4 border-earth-brown">
                  <h4 className="font-serif font-bold text-earth-brown mb-2">Local Businesses</h4>
                  <div className="space-y-2">
                    {businesses.map((business: Business) => (
                      <div key={business.id} className="bg-white rounded-lg p-3 border border-earth-peru/20">
                        <h5 className="font-semibold text-earth-brown text-sm">{business.name}</h5>
                        {business.description && (
                          <p className="text-xs text-earth-dark/70">{business.description}</p>
                        )}
                        <div className="flex items-center mt-1 text-xs text-earth-sage">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"/>
                          </svg>
                          <span>{business.address}</span>
                        </div>
                        {business.businessType && (
                          <div className="mt-1">
                            <span className="inline-block bg-earth-gold/20 text-earth-brown px-2 py-1 rounded text-xs">
                              {business.businessType}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
