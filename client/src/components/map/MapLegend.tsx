/**
 * Map Legend - Shows color coding for commodities and states
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Info,
  Gem,
  MapPin,
  X
} from 'lucide-react';

interface MapLegendProps {
  isVisible: boolean;
  onClose: () => void;
  showNationalMining?: boolean;
  showExploration?: boolean;
  showMining?: boolean;
}

const COMMODITY_COLORS = [
  { name: 'Gold', color: '#FFD700', emoji: '🥇' },
  { name: 'Iron', color: '#B22222', emoji: '🔴' },
  { name: 'Lithium', color: '#9370DB', emoji: '🔋' },
  { name: 'Copper', color: '#B87333', emoji: '🟤' },
  { name: 'Nickel', color: '#71797E', emoji: '⚪' },
  { name: 'Rare Earths', color: '#FF69B4', emoji: '💎' },
  { name: 'Cobalt', color: '#0047AB', emoji: '🔵' },
  { name: 'Uranium', color: '#32CD32', emoji: '☢️' },
  { name: 'Zinc', color: '#708090', emoji: '🩶' },
  { name: 'Silicon', color: '#87CEEB', emoji: '💠' },
  { name: 'Manganese', color: '#8B4513', emoji: '🟫' },
  { name: 'Graphite', color: '#2F4F4F', emoji: '⬛' },
];

const STATE_COLORS = [
  { code: 'WA', name: 'Western Australia', color: '#FF6B35' },
  { code: 'SA', name: 'South Australia', color: '#2EC4B6' },
  { code: 'QLD', name: 'Queensland', color: '#9B5DE5' },
  { code: 'NSW', name: 'New South Wales', color: '#00BBF9' },
  { code: 'VIC', name: 'Victoria', color: '#00F5D4' },
  { code: 'NT', name: 'Northern Territory', color: '#FEE440' },
  { code: 'TAS', name: 'Tasmania', color: '#F15BB5' },
];

const LAYER_TYPES = [
  { 
    name: 'Aboriginal Territories', 
    color: '#8B4513', 
    description: 'Traditional lands and cultural boundaries',
    pattern: 'solid'
  },
  { 
    name: 'Native Title', 
    color: '#3B82F6', 
    description: 'Legal recognition areas',
    pattern: 'hatched'
  },
  { 
    name: 'RATSIB', 
    color: '#22C55E', 
    description: 'Regional representative bodies',
    pattern: 'dashed'
  },
  { 
    name: 'Mining Tenements', 
    color: '#F97316', 
    description: 'Active mining leases (WA)',
    pattern: 'solid'
  },
  { 
    name: 'Exploration', 
    color: '#A855F7', 
    description: 'Exploration permits (WA)',
    pattern: 'dotted'
  },
  { 
    name: 'National Mining', 
    color: '#6366F1', 
    description: 'Critical minerals (nationwide)',
    pattern: 'circle'
  },
];

export function MapLegend({ 
  isVisible, 
  onClose,
  showNationalMining,
  showExploration,
  showMining
}: MapLegendProps) {
  const [expandedSections, setExpandedSections] = useState({
    layers: true,
    commodities: false,
    states: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isVisible) return null;

  return (
    <div 
      className="absolute right-4 bottom-24 z-[500] w-64 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden"
      data-testid="map-legend-panel"
    >
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span className="font-semibold text-sm">Map Legend</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={onClose}
          data-testid="button-close-legend"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 space-y-3 max-h-[350px] overflow-y-auto">
        {/* Layer Types */}
        <Collapsible open={expandedSections.layers}>
          <CollapsibleTrigger
            onClick={() => toggleSection('layers')}
            className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md transition-colors"
          >
            <span className="font-medium text-sm">Layer Types</span>
            {expandedSections.layers ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-2 pl-2">
              {LAYER_TYPES.map((layer) => (
                <div key={layer.name} className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {layer.pattern === 'circle' ? (
                      <div 
                        className="w-4 h-4 rounded-full border-2" 
                        style={{ backgroundColor: layer.color, borderColor: 'white' }}
                      />
                    ) : layer.pattern === 'dashed' ? (
                      <div 
                        className="w-4 h-3 border-2 border-dashed rounded-sm" 
                        style={{ borderColor: layer.color }}
                      />
                    ) : layer.pattern === 'hatched' ? (
                      <div 
                        className="w-4 h-3 rounded-sm opacity-60" 
                        style={{ backgroundColor: layer.color }}
                      />
                    ) : (
                      <div 
                        className="w-4 h-3 rounded-sm" 
                        style={{ backgroundColor: layer.color }}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium">{layer.name}</div>
                    <div className="text-[10px] text-muted-foreground">{layer.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Commodity Colors */}
        {(showNationalMining || showExploration || showMining) && (
          <Collapsible open={expandedSections.commodities}>
            <CollapsibleTrigger
              onClick={() => toggleSection('commodities')}
              className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <Gem className="h-4 w-4" />
                <span className="font-medium text-sm">Commodity Colors</span>
              </div>
              {expandedSections.commodities ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="grid grid-cols-2 gap-1 pl-2">
                {COMMODITY_COLORS.map((commodity) => (
                  <div 
                    key={commodity.name} 
                    className="flex items-center gap-1.5 text-xs py-0.5"
                  >
                    <span 
                      className="w-3 h-3 rounded-full border border-white/50" 
                      style={{ backgroundColor: commodity.color }}
                    />
                    <span className="truncate">{commodity.name}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* State Colors */}
        {showNationalMining && (
          <Collapsible open={expandedSections.states}>
            <CollapsibleTrigger
              onClick={() => toggleSection('states')}
              className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="font-medium text-sm">State Colors</span>
              </div>
              {expandedSections.states ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="grid grid-cols-2 gap-1 pl-2">
                {STATE_COLORS.map((state) => (
                  <div 
                    key={state.code} 
                    className="flex items-center gap-1.5 text-xs py-0.5"
                  >
                    <span 
                      className="w-3 h-3 rounded-full border border-white/50" 
                      style={{ backgroundColor: state.color }}
                    />
                    <span>{state.code}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Data Source Attribution */}
        <div className="pt-2 border-t">
          <div className="text-[10px] text-muted-foreground text-center">
            <div className="font-medium">Data Sources</div>
            <div>Geoscience Australia • WA DMIRS</div>
            <div>Native Title Tribunal • AIATSIS</div>
          </div>
        </div>
      </div>
    </div>
  );
}
