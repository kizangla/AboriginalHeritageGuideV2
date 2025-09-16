import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Search,
  Calendar,
  Building2,
  MapPin,
  Layers,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

export interface MiningFilters {
  tenementTypes: string[];
  status: string[];
  holders: string[];
  mineralTypes: string[];
  majorCompaniesOnly: boolean;
  areaRange: { min: number; max: number };
  dateRange: { start: string; end: string };
  search: string;
}

interface FilterOptions {
  tenementTypes?: string[];
  statuses?: string[];
  mineralTypes?: string[];
  topHolders?: { name: string; count: number }[];
  states?: string[];
  areaRange?: { min: number; max: number };
}

interface MiningFilterPanelProps {
  onFiltersChange: (filters: MiningFilters) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

export function MiningFilterPanel({ onFiltersChange, onClose, isOpen = true }: MiningFilterPanelProps) {
  const [filters, setFilters] = useState<MiningFilters>({
    tenementTypes: [],
    status: [],
    holders: [],
    mineralTypes: [],
    majorCompaniesOnly: false,
    areaRange: { min: 0, max: 100000 },
    dateRange: { start: '', end: '' },
    search: ''
  });

  const [expandedSections, setExpandedSections] = useState({
    type: true,
    status: true,
    minerals: false,
    companies: false,
    area: false,
    dates: false
  });

  const [searchInput, setSearchInput] = useState('');

  // Fetch available filter options from the API
  const { data: filterOptions, isLoading } = useQuery<FilterOptions>({
    queryKey: ['/api/mining/filter-options'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Update parent component when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleFilter = (category: keyof MiningFilters, value: string) => {
    setFilters(prev => {
      const categoryFilters = prev[category] as string[];
      const updated = categoryFilters.includes(value)
        ? categoryFilters.filter(v => v !== value)
        : [...categoryFilters, value];
      
      return {
        ...prev,
        [category]: updated
      };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      tenementTypes: [],
      status: [],
      holders: [],
      mineralTypes: [],
      majorCompaniesOnly: false,
      areaRange: { min: 0, max: 100000 },
      dateRange: { start: '', end: '' },
      search: ''
    });
    setSearchInput('');
  };

  const activeFilterCount = 
    filters.tenementTypes.length +
    filters.status.length +
    filters.holders.length +
    filters.mineralTypes.length +
    (filters.majorCompaniesOnly ? 1 : 0) +
    (filters.search ? 1 : 0) +
    (filters.dateRange.start || filters.dateRange.end ? 1 : 0);

  if (!isOpen) return null;

  return (
    <Card className="absolute top-4 left-20 z-[1000] w-80 max-h-[calc(100vh-2rem)] overflow-hidden shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle className="text-lg">Mining Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              disabled={activeFilterCount === 0}
              className="h-8 px-2"
            >
              Clear
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-10rem)]">
          <div className="px-4 pb-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search holders, minerals..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setFilters(prev => ({ ...prev, search: searchInput }));
                  }
                }}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchInput('');
                    setFilters(prev => ({ ...prev, search: '' }));
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Tenement Type */}
            <Collapsible open={expandedSections.type}>
              <CollapsibleTrigger
                onClick={() => toggleSection('type')}
                className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span className="font-medium text-sm">Tenement Type</span>
                  {filters.tenementTypes.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {filters.tenementTypes.length}
                    </Badge>
                  )}
                </div>
                {expandedSections.type ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-2 pl-6">
                  {(filterOptions?.tenementTypes || []).map((type: string) => (
                    <label
                      key={type}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-1 rounded"
                    >
                      <Checkbox
                        checked={filters.tenementTypes.includes(type)}
                        onCheckedChange={() => toggleFilter('tenementTypes', type)}
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Status */}
            <Collapsible open={expandedSections.status}>
              <CollapsibleTrigger
                onClick={() => toggleSection('status')}
                className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
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
                <div className="space-y-2 pl-6">
                  {(filterOptions?.statuses || ['LIVE', 'PENDING', 'EXPIRED']).map((status: string) => (
                    <label
                      key={status}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-1 rounded"
                    >
                      <Checkbox
                        checked={filters.status.includes(status)}
                        onCheckedChange={() => toggleFilter('status', status)}
                      />
                      <span className="text-sm flex items-center gap-2">
                        {status}
                        <span
                          className={`w-2 h-2 rounded-full ${
                            status === 'LIVE' 
                              ? 'bg-green-500' 
                              : status === 'PENDING' 
                              ? 'bg-yellow-500' 
                              : 'bg-gray-400'
                          }`}
                        />
                      </span>
                    </label>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Minerals */}
            <Collapsible open={expandedSections.minerals}>
              <CollapsibleTrigger
                onClick={() => toggleSection('minerals')}
                className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium text-sm">Minerals</span>
                  {filters.mineralTypes.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {filters.mineralTypes.length}
                    </Badge>
                  )}
                </div>
                {expandedSections.minerals ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ScrollArea className="h-48">
                  <div className="space-y-2 pl-6 pr-2">
                    {(filterOptions?.mineralTypes || []).slice(0, 20).map((mineral: string) => (
                      <label
                        key={mineral}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-1 rounded"
                      >
                        <Checkbox
                          checked={filters.mineralTypes.includes(mineral)}
                          onCheckedChange={() => toggleFilter('mineralTypes', mineral)}
                        />
                        <span className="text-sm">{mineral}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>

            {/* Major Companies */}
            <Collapsible open={expandedSections.companies}>
              <CollapsibleTrigger
                onClick={() => toggleSection('companies')}
                className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium text-sm">Companies</span>
                  {(filters.holders.length > 0 || filters.majorCompaniesOnly) && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {filters.holders.length + (filters.majorCompaniesOnly ? 1 : 0)}
                    </Badge>
                  )}
                </div>
                {expandedSections.companies ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-3 pl-6">
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-1 rounded">
                    <Checkbox
                      checked={filters.majorCompaniesOnly}
                      onCheckedChange={(checked) => 
                        setFilters(prev => ({ ...prev, majorCompaniesOnly: checked as boolean }))
                      }
                    />
                    <span className="text-sm font-medium">Major Companies Only</span>
                  </label>
                  <ScrollArea className="h-32">
                    <div className="space-y-2 pr-2">
                      {(filterOptions?.topHolders || []).slice(0, 15).map((holder: { name: string; count: number }) => (
                        <label
                          key={holder.name}
                          className="flex items-center justify-between cursor-pointer hover:bg-accent p-1 rounded"
                        >
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={filters.holders.includes(holder.name)}
                              onCheckedChange={() => toggleFilter('holders', holder.name)}
                            />
                            <span className="text-sm truncate max-w-[180px]" title={holder.name}>
                              {holder.name}
                            </span>
                          </div>
                          <Badge variant="outline" className="h-5 px-1.5 text-xs">
                            {holder.count}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Area Range */}
            <Collapsible open={expandedSections.area}>
              <CollapsibleTrigger
                onClick={() => toggleSection('area')}
                className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium text-sm">Area (hectares)</span>
                </div>
                {expandedSections.area ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-3 pl-6 pr-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{filters.areaRange.min.toLocaleString()} ha</span>
                    <span>{filters.areaRange.max.toLocaleString()} ha</span>
                  </div>
                  <Slider
                    value={[filters.areaRange.min, filters.areaRange.max]}
                    onValueChange={(values) => {
                      setFilters(prev => ({
                        ...prev,
                        areaRange: { min: values[0], max: values[1] }
                      }));
                    }}
                    max={100000}
                    min={0}
                    step={1000}
                    className="w-full"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Date Range */}
            <Collapsible open={expandedSections.dates}>
              <CollapsibleTrigger
                onClick={() => toggleSection('dates')}
                className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium text-sm">Grant Date</span>
                  {(filters.dateRange.start || filters.dateRange.end) && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                {expandedSections.dates ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-3 pl-6 pr-2">
                  <div>
                    <Label htmlFor="start-date" className="text-xs">From</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) => 
                        setFilters(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value }
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-xs">To</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => 
                        setFilters(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value }
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}