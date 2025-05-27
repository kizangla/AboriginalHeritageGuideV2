import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ControlPanelProps {
  onResetView: () => void;
}

export default function ControlPanel({ onResetView }: ControlPanelProps) {
  const handleToggleSatellite = () => {
    // Placeholder for satellite view toggle
    alert('Satellite view toggle - would switch tile layers in production');
  };

  return (
    <Card className="control-panel absolute bottom-5 left-5 z-[1000] bg-earth-beige/95 backdrop-blur-sm border-earth-brown/20 shadow-lg">
      <div className="p-4">
        <h4 className="font-serif font-bold text-earth-brown mb-3 flex items-center">
          <svg className="w-5 h-5 mr-2 text-earth-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,16L19.36,10.27L21,9L12,2L3,9L4.63,10.27L12,16M12,18.54L4.62,12.81L3,14.07L12,21.07L21,14.07L19.38,12.8L12,18.54Z"/>
          </svg>
          Map Controls
        </h4>
        
        <div className="space-y-2">
          <Button 
            onClick={onResetView}
            variant="secondary"
            size="sm"
            className="w-full bg-earth-peru hover:bg-earth-peru/90 text-white"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
            </svg>
            Reset View
          </Button>
          
          <Button 
            onClick={handleToggleSatellite}
            variant="secondary"
            size="sm"
            className="w-full bg-earth-sage hover:bg-earth-sage/90 text-white"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3Z"/>
            </svg>
            Satellite View
          </Button>
          
          <div className="mt-4 pt-3 border-t border-earth-peru/20">
            <h5 className="font-semibold text-earth-dark text-xs mb-2 uppercase tracking-wide">Legend</h5>
            <div className="space-y-1 text-xs">
              <div className="legend-item flex items-center">
                <div className="w-5 h-5 rounded mr-2 border border-earth-brown/30" style={{backgroundColor: '#E74C3C'}}></div>
                <span>Northern Groups</span>
              </div>
              <div className="legend-item flex items-center">
                <div className="w-5 h-5 rounded mr-2 border border-earth-brown/30" style={{backgroundColor: '#3498DB'}}></div>
                <span>Western Groups</span>
              </div>
              <div className="legend-item flex items-center">
                <div className="w-5 h-5 rounded mr-2 border border-earth-brown/30" style={{backgroundColor: '#F39C12'}}></div>
                <span>Central Groups</span>
              </div>
              <div className="legend-item flex items-center">
                <div className="w-5 h-5 rounded mr-2 border border-earth-brown/30" style={{backgroundColor: '#27AE60'}}></div>
                <span>Eastern Groups</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
