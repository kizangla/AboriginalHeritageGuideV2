import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Map,
  Users,
  Mountain,
  Building2,
  Briefcase,
  Eye,
  EyeOff,
  Palette,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayerConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
  opacity: number;
  color?: string;
  description?: string;
}

interface MobileLayerControlProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layers: Record<string, boolean>;
  onLayerToggle: (layerId: string, enabled: boolean) => void;
  onOpacityChange?: (layerId: string, opacity: number) => void;
  className?: string;
}

export function MobileLayerControl({
  open,
  onOpenChange,
  layers,
  onLayerToggle,
  onOpacityChange,
  className
}: MobileLayerControlProps) {
  const isMobile = useIsMobile();
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>({
    territories: 70,
    nativeTitle: 60,
    ratsib: 50,
    mining: 80,
    exploration: 80,
    businesses: 100
  });

  const layerConfigs: LayerConfig[] = [
    {
      id: 'territories',
      name: 'Aboriginal Territories',
      icon: <Map className="w-4 h-4" />,
      enabled: layers.territories ?? true,
      opacity: layerOpacities.territories,
      color: 'bg-earth-brown',
      description: 'Traditional lands and cultural boundaries'
    },
    {
      id: 'nativeTitle',
      name: 'Native Title',
      icon: <Users className="w-4 h-4" />,
      enabled: layers.nativeTitle ?? false,
      opacity: layerOpacities.nativeTitle,
      color: 'bg-blue-500',
      description: 'Legal recognition of Indigenous land rights'
    },
    {
      id: 'ratsib',
      name: 'RATSIB Boundaries',
      icon: <Building2 className="w-4 h-4" />,
      enabled: layers.ratsib ?? false,
      opacity: layerOpacities.ratsib,
      color: 'bg-green-500',
      description: 'Regional Aboriginal & Torres Strait Islander Bodies'
    },
    {
      id: 'mining',
      name: 'Mining Tenements',
      icon: <Mountain className="w-4 h-4" />,
      enabled: layers.mining ?? false,
      opacity: layerOpacities.mining,
      color: 'bg-orange-500',
      description: 'Active mining leases and operations'
    },
    {
      id: 'exploration',
      name: 'Exploration Areas',
      icon: <Mountain className="w-4 h-4" />,
      enabled: layers.exploration ?? false,
      opacity: layerOpacities.exploration,
      color: 'bg-purple-500',
      description: 'Exploration permits and prospecting areas'
    },
    {
      id: 'businesses',
      name: 'Indigenous Businesses',
      icon: <Briefcase className="w-4 h-4" />,
      enabled: layers.businesses ?? false,
      opacity: layerOpacities.businesses,
      color: 'bg-teal-500',
      description: 'Indigenous-owned businesses and services'
    }
  ];

  const toggleLayerExpansion = (layerId: string) => {
    setExpandedLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layerId)) {
        newSet.delete(layerId);
      } else {
        newSet.add(layerId);
      }
      return newSet;
    });
  };

  const handleOpacityChange = (layerId: string, opacity: number) => {
    setLayerOpacities(prev => ({ ...prev, [layerId]: opacity }));
    onOpacityChange?.(layerId, opacity);
  };

  const enabledCount = layerConfigs.filter(l => l.enabled).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"}
        className={cn(
          isMobile ? "h-[80vh]" : "w-[400px]",
          "z-[1000]",
          className
        )}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Map Layers</span>
            <span className="text-sm font-normal text-muted-foreground">
              {enabledCount} active
            </span>
          </SheetTitle>
          <SheetDescription>
            Toggle layers to customize your map view
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(100%-120px)]">
          {layerConfigs.map((layer) => {
            const isExpanded = expandedLayers.has(layer.id);
            
            return (
              <div
                key={layer.id}
                className={cn(
                  "border rounded-lg transition-all",
                  layer.enabled ? "border-primary/20 bg-accent/5" : "border-border"
                )}
              >
                {/* Main layer toggle */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        layer.color,
                        layer.enabled ? "opacity-100" : "opacity-40"
                      )}>
                        {layer.icon}
                      </div>
                      <div className="flex-1">
                        <Label
                          htmlFor={`layer-${layer.id}`}
                          className={cn(
                            "text-sm font-medium cursor-pointer",
                            !layer.enabled && "text-muted-foreground"
                          )}
                        >
                          {layer.name}
                        </Label>
                        {layer.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {layer.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      id={`layer-${layer.id}`}
                      checked={layer.enabled}
                      onCheckedChange={(checked) => onLayerToggle(layer.id, checked)}
                      className="data-[state=checked]:bg-primary"
                      data-testid={`switch-layer-${layer.id}`}
                    />
                  </div>

                  {/* Expand/collapse button for opacity control */}
                  {layer.enabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLayerExpansion(layer.id)}
                      className="w-full mt-3 justify-between h-8"
                      data-testid={`button-expand-${layer.id}`}
                    >
                      <span className="text-xs">Adjust opacity</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Opacity slider (expanded state) */}
                {isExpanded && layer.enabled && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="flex items-center gap-3">
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                      <Slider
                        value={[layer.opacity]}
                        onValueChange={([value]) => handleOpacityChange(layer.id, value)}
                        min={0}
                        max={100}
                        step={10}
                        className="flex-1"
                        data-testid={`slider-opacity-${layer.id}`}
                      />
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium w-10 text-right">
                        {layer.opacity}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick presets for mobile */}
        {isMobile && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Quick presets</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onLayerToggle('territories', true);
                  onLayerToggle('nativeTitle', false);
                  onLayerToggle('ratsib', false);
                  onLayerToggle('mining', false);
                  onLayerToggle('exploration', false);
                  onLayerToggle('businesses', false);
                }}
                className="text-xs"
                data-testid="button-preset-territories"
              >
                Territories Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onLayerToggle('territories', true);
                  onLayerToggle('nativeTitle', true);
                  onLayerToggle('ratsib', true);
                  onLayerToggle('mining', false);
                  onLayerToggle('exploration', false);
                  onLayerToggle('businesses', false);
                }}
                className="text-xs"
                data-testid="button-preset-land-rights"
              >
                Land Rights
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onLayerToggle('territories', true);
                  onLayerToggle('nativeTitle', false);
                  onLayerToggle('ratsib', false);
                  onLayerToggle('mining', true);
                  onLayerToggle('exploration', true);
                  onLayerToggle('businesses', false);
                }}
                className="text-xs"
                data-testid="button-preset-mining"
              >
                Mining Activity
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}