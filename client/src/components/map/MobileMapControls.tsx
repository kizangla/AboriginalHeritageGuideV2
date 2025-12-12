import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Plus, 
  Minus, 
  MapPin, 
  Layers, 
  Filter,
  Crosshair,
  Navigation,
  Menu,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileMapControlsProps {
  map: L.Map | null;
  onToggleLayers?: () => void;
  onToggleFilters?: () => void;
  onCenterLocation?: () => void;
  hasFilters?: boolean;
  className?: string;
}

export function MobileMapControls({ 
  map, 
  onToggleLayers, 
  onToggleFilters, 
  onCenterLocation,
  hasFilters = false,
  className 
}: MobileMapControlsProps) {
  const isMobile = useIsMobile();
  const [currentZoom, setCurrentZoom] = useState<number>(5);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!map) return;

    const handleZoomEnd = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoomend', handleZoomEnd);
    setCurrentZoom(map.getZoom());

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  const handleZoomIn = () => {
    if (!map) return;
    map.zoomIn();
  };

  const handleZoomOut = () => {
    if (!map) return;
    map.zoomOut();
  };

  const handleCenterLocation = () => {
    if (!map || isLocating) return;
    
    setIsLocating(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 13);
          setIsLocating(false);
          
          // Add a temporary marker at user's location
          const L = (window as any).L;
          if (L) {
            const marker = L.marker([latitude, longitude], {
              icon: L.divIcon({
                className: 'user-location-marker',
                html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>',
                iconSize: [20, 20]
              })
            }).addTo(map);
            
            // Remove marker after 5 seconds
            setTimeout(() => {
              map.removeLayer(marker);
            }, 5000);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLocating(false);
          onCenterLocation?.();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setIsLocating(false);
      onCenterLocation?.();
    }
  };

  const handleResetView = () => {
    if (!map) return;
    map.setView([-25.2744, 133.7751], 5); // Center of Australia
  };

  // Mobile layout with bottom drawer
  if (isMobile) {
    return (
      <>
        {/* Floating zoom controls */}
        <div className={cn(
          "absolute right-4 bottom-24 z-[1000] flex flex-col gap-2 touch-manipulation",
          className
        )}>
          <Button
            variant="default"
            size="icon"
            onClick={handleZoomIn}
            className="w-12 h-12 rounded-full bg-background shadow-lg border"
            data-testid="button-zoom-in"
          >
            <Plus className="w-5 h-5" />
          </Button>
          <div className="text-xs text-center font-medium px-2 py-1 bg-background rounded-lg shadow border">
            {Math.round(currentZoom)}
          </div>
          <Button
            variant="default"
            size="icon"
            onClick={handleZoomOut}
            className="w-12 h-12 rounded-full bg-background shadow-lg border"
            data-testid="button-zoom-out"
          >
            <Minus className="w-5 h-5" />
          </Button>
        </div>

        {/* Bottom control drawer */}
        <Drawer open={isControlsExpanded} onOpenChange={setIsControlsExpanded}>
          <DrawerTrigger asChild>
            <Button
              variant="default"
              className={cn(
                "fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000]",
                "px-6 py-3 rounded-full shadow-lg",
                "bg-primary text-primary-foreground",
                "touch-manipulation"
              )}
              data-testid="button-mobile-controls"
              onClick={(e) => {
                e.stopPropagation();
                setIsControlsExpanded(true);
              }}
            >
              <ChevronUp className="w-4 h-4 mr-2" />
              Map Controls
            </Button>
          </DrawerTrigger>
          <DrawerContent className="pb-6 z-[1001]">
            <DrawerHeader>
              <DrawerTitle>Map Controls</DrawerTitle>
              <DrawerDescription>
                Navigate and customize your map view
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 space-y-4">
              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleCenterLocation}
                  disabled={isLocating}
                  className="justify-start"
                  data-testid="button-my-location"
                >
                  <Crosshair className={cn(
                    "w-4 h-4 mr-2",
                    isLocating && "animate-pulse"
                  )} />
                  {isLocating ? 'Locating...' : 'My Location'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleResetView}
                  className="justify-start"
                  data-testid="button-reset-view"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Reset View
                </Button>
                
                {onToggleLayers && (
                  <Button
                    variant="outline"
                    onClick={onToggleLayers}
                    className="justify-start"
                    data-testid="button-toggle-layers"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Layers
                  </Button>
                )}
                
                {onToggleFilters && hasFilters && (
                  <Button
                    variant="outline"
                    onClick={onToggleFilters}
                    className="justify-start"
                    data-testid="button-toggle-filters"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                )}
              </div>

              {/* Touch gesture hints */}
              <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                <h4 className="font-medium">Touch Gestures</h4>
                <div className="space-y-1 text-muted-foreground">
                  <p>• Tap: Select territory</p>
                  <p>• Pinch: Zoom in/out</p>
                  <p>• Two-finger drag: Pan map</p>
                  <p>• Double tap: Quick zoom</p>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop layout with floating controls
  return (
    <div className={cn(
      "absolute top-4 right-4 z-[400] flex flex-col gap-2",
      className
    )}>
      <div className="bg-background rounded-lg shadow-lg border p-1 flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="h-8 w-8 p-0"
          data-testid="button-zoom-in-desktop"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <div className="text-xs text-center font-medium py-1">
          {Math.round(currentZoom)}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="h-8 w-8 p-0"
          data-testid="button-zoom-out-desktop"
        >
          <Minus className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="bg-background rounded-lg shadow-lg border p-1 flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCenterLocation}
          disabled={isLocating}
          className="h-8 w-8 p-0"
          title="My Location"
          data-testid="button-my-location-desktop"
        >
          <Crosshair className={cn(
            "w-4 h-4",
            isLocating && "animate-pulse"
          )} />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetView}
          className="h-8 w-8 p-0"
          title="Reset View"
          data-testid="button-reset-view-desktop"
        >
          <Navigation className="w-4 h-4" />
        </Button>
        
        {onToggleLayers && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleLayers}
            className="h-8 w-8 p-0"
            title="Toggle Layers"
            data-testid="button-toggle-layers-control"
          >
            <Layers className="w-4 h-4" />
          </Button>
        )}
        
        {onToggleFilters && hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFilters}
            className="h-8 w-8 p-0"
            title="Toggle Filters"
            data-testid="button-toggle-filters-desktop"
          >
            <Filter className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}