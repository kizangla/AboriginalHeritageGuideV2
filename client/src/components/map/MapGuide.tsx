import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function MapGuide() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-5 z-[1001] bg-earth-gold text-earth-dark hover:bg-yellow-400 shadow-lg"
      >
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
        </svg>
        Quick Guide
      </Button>
    );
  }

  return (
    <Card className="fixed top-20 right-5 z-[1001] w-80 bg-earth-beige/95 backdrop-blur-sm border-earth-brown/20 shadow-xl">
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-serif font-bold text-earth-brown">How to Use This Map</h3>
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="sm"
            className="text-earth-brown hover:bg-earth-brown/10"
          >
            ✕
          </Button>
        </div>
        
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-earth-gold text-earth-dark flex items-center justify-center text-xs font-bold mt-0.5">1</div>
            <div>
              <h4 className="font-semibold text-earth-brown">Click on Territories</h4>
              <p className="text-earth-dark/70">Tap any colored region to learn about Indigenous groups, culture, and traditions</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-earth-gold text-earth-dark flex items-center justify-center text-xs font-bold mt-0.5">2</div>
            <div>
              <h4 className="font-semibold text-earth-brown">Search Locations</h4>
              <p className="text-earth-dark/70">Use the search box to find specific cities, landmarks, or addresses</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-earth-gold text-earth-dark flex items-center justify-center text-xs font-bold mt-0.5">3</div>
            <div>
              <h4 className="font-semibold text-earth-brown">Explore Details</h4>
              <p className="text-earth-dark/70">Click "View Detailed Information" to discover businesses and cultural sites</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-earth-gold text-earth-dark flex items-center justify-center text-xs font-bold mt-0.5">4</div>
            <div>
              <h4 className="font-semibold text-earth-brown">Navigate Easily</h4>
              <p className="text-earth-dark/70">Use "Reset View" to return to the full Australia view anytime</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-3 bg-white/50 rounded-lg">
          <h4 className="font-semibold text-earth-brown mb-2 flex items-center">
            <svg className="w-4 h-4 mr-2 text-earth-gold" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
            </svg>
            Cultural Respect
          </h4>
          <p className="text-xs text-earth-dark/70">
            This map shows traditional territories with deep cultural significance. Please approach with respect and understanding.
          </p>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-earth-dark/50">
            Displaying all 390 authentic Indigenous territories
          </p>
        </div>
      </div>
    </Card>
  );
}