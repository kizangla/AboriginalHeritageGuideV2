/**
 * National Mining Filters - State and Commodity filtering for national deposits
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Gem, 
  X,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NationalMiningFilters {
  states: string[];
  commodities: string[];
  status: string[];
}

interface NationalMiningFiltersProps {
  filters: NationalMiningFilters;
  onFiltersChange: (filters: NationalMiningFilters) => void;
  isOpen: boolean;
  onClose: () => void;
  depositStats?: {
    byState: Record<string, number>;
    byCommodity: Record<string, number>;
    byStatus: Record<string, number>;
    total: number;
  };
}

const AUSTRALIAN_STATES = [
  { code: 'WA', name: 'Western Australia', color: '#FF6B35' },
  { code: 'SA', name: 'South Australia', color: '#2EC4B6' },
  { code: 'QLD', name: 'Queensland', color: '#9B5DE5' },
  { code: 'NSW', name: 'New South Wales', color: '#00BBF9' },
  { code: 'VIC', name: 'Victoria', color: '#00F5D4' },
  { code: 'NT', name: 'Northern Territory', color: '#FEE440' },
  { code: 'TAS', name: 'Tasmania', color: '#F15BB5' },
];

const COMMODITY_COLORS: Record<string, string> = {
  'Gold': '#FFD700',
  'Iron': '#B22222',
  'Lithium': '#9370DB',
  'Copper': '#B87333',
  'Nickel': '#71797E',
  'Rare Earth': '#FF69B4',
  'Cobalt': '#0047AB',
  'Uranium': '#32CD32',
  'Zinc': '#708090',
  'Silicon': '#87CEEB',
  'Manganese': '#8B4513',
  'Graphite': '#2F4F4F',
  'Vanadium': '#4169E1',
  'Tungsten': '#C0C0C0',
};

export function NationalMiningFilters({
  filters,
  onFiltersChange,
  isOpen,
  onClose,
  depositStats
}: NationalMiningFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    states: true,
    commodities: true,
    status: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleState = (stateCode: string) => {
    const newStates = filters.states.includes(stateCode)
      ? filters.states.filter(s => s !== stateCode)
      : [...filters.states, stateCode];
    onFiltersChange({ ...filters, states: newStates });
  };

  const toggleCommodity = (commodity: string) => {
    const newCommodities = filters.commodities.includes(commodity)
      ? filters.commodities.filter(c => c !== commodity)
      : [...filters.commodities, commodity];
    onFiltersChange({ ...filters, commodities: newCommodities });
  };

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const clearAllFilters = () => {
    onFiltersChange({ states: [], commodities: [], status: [] });
  };

  const activeFilterCount = 
    filters.states.length + 
    filters.commodities.length + 
    filters.status.length;

  const commodityList = depositStats?.byCommodity 
    ? Object.entries(depositStats.byCommodity)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }))
    : [];

  const statusList = depositStats?.byStatus
    ? Object.entries(depositStats.byStatus)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }))
    : [];

  if (!isOpen) return null;

  return (
    <div 
      className="absolute left-4 top-20 z-[500] w-72 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden"
      data-testid="national-mining-filters-panel"
    >
      <div className="flex items-center justify-between p-3 border-b bg-indigo-500/10">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-indigo-500" />
          <span className="font-semibold text-sm">National Mining Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-indigo-500 text-white">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={onClose}
          data-testid="button-close-national-filters"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="p-3 space-y-3">
          {activeFilterCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAllFilters}
              className="w-full text-xs"
              data-testid="button-clear-national-filters"
            >
              Clear All Filters
            </Button>
          )}

          {depositStats && (
            <div className="text-xs text-muted-foreground text-center py-1 border-b">
              Showing {depositStats.total} deposits from Geoscience Australia
            </div>
          )}

          {/* State Filter */}
          <Collapsible open={expandedSections.states}>
            <CollapsibleTrigger
              onClick={() => toggleSection('states')}
              className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="font-medium text-sm">States</span>
                {filters.states.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {filters.states.length}
                  </Badge>
                )}
              </div>
              {expandedSections.states ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="grid grid-cols-2 gap-1 pl-2">
                {AUSTRALIAN_STATES.map((state) => {
                  const count = depositStats?.byState[state.code] || 0;
                  const isSelected = filters.states.includes(state.code);
                  return (
                    <Button
                      key={state.code}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleState(state.code)}
                      className={cn(
                        "h-8 text-xs justify-start gap-1",
                        isSelected && "ring-2 ring-offset-1"
                      )}
                      style={{
                        backgroundColor: isSelected ? state.color : undefined,
                        borderColor: state.color,
                        color: isSelected ? 'white' : undefined
                      }}
                      data-testid={`filter-state-${state.code.toLowerCase()}`}
                    >
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: state.color }}
                      />
                      {state.code}
                      {count > 0 && (
                        <span className="ml-auto opacity-70">({count})</span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Commodity Filter */}
          <Collapsible open={expandedSections.commodities}>
            <CollapsibleTrigger
              onClick={() => toggleSection('commodities')}
              className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <Gem className="h-4 w-4" />
                <span className="font-medium text-sm">Commodities</span>
                {filters.commodities.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {filters.commodities.length}
                  </Badge>
                )}
              </div>
              {expandedSections.commodities ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-1 pl-2 max-h-48 overflow-y-auto">
                {commodityList.length > 0 ? commodityList.map(({ name, count }) => {
                  const isSelected = filters.commodities.includes(name);
                  const color = COMMODITY_COLORS[name] || '#6366F1';
                  return (
                    <Button
                      key={name}
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      onClick={() => toggleCommodity(name)}
                      className={cn(
                        "w-full h-7 text-xs justify-start gap-2",
                        isSelected && "ring-1 ring-offset-1"
                      )}
                      style={{
                        backgroundColor: isSelected ? color : undefined,
                        color: isSelected ? 'white' : undefined
                      }}
                      data-testid={`filter-commodity-${name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <span 
                        className="w-3 h-3 rounded-full border" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate">{name}</span>
                      <span className="ml-auto opacity-70">({count})</span>
                    </Button>
                  );
                }) : (
                  <div className="text-xs text-muted-foreground p-2">
                    Loading commodity data...
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Status Filter */}
          <Collapsible open={expandedSections.status}>
            <CollapsibleTrigger
              onClick={() => toggleSection('status')}
              className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Status</span>
                {filters.status.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {filters.status.length}
                  </Badge>
                )}
              </div>
              {expandedSections.status ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-1 pl-2">
                {statusList.map(({ name, count }) => {
                  const isSelected = filters.status.includes(name);
                  return (
                    <Button
                      key={name}
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      onClick={() => toggleStatus(name)}
                      className="w-full h-7 text-xs justify-start"
                      data-testid={`filter-status-${name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <span className="truncate">{name}</span>
                      <span className="ml-auto opacity-70">({count})</span>
                    </Button>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
