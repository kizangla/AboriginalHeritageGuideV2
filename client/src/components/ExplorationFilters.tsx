import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';

interface ExplorationFiltersProps {
  onFilterChange: (filters: ExplorationFilters) => void;
  isVisible: boolean;
  currentFilters: ExplorationFilters;
}

export interface ExplorationFilters {
  commodity?: string;
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
  operator?: string;
}

export function ExplorationFilters({ onFilterChange, isVisible, currentFilters }: ExplorationFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ExplorationFilters>(currentFilters);

  // Fetch available commodities from authentic WA DMIRS data
  const { data: commoditiesData } = useQuery({
    queryKey: ['/api/exploration/commodities'],
    enabled: isVisible
  });

  const commodities = commoditiesData?.commodities || [];

  const handleFilterChange = (key: keyof ExplorationFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    console.log('Filter changed:', key, value, 'New filters:', newFilters);
    // Apply filters immediately when changed
    onFilterChange(newFilters);
  };

  const applyFilters = () => {
    console.log('Applying exploration filters:', localFilters);
    onFilterChange(localFilters);
  };

  const resetFilters = () => {
    const defaultFilters: ExplorationFilters = { limit: 2000 };
    setLocalFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  if (!isVisible) return null;

  return (
    <Card className="absolute top-4 right-4 w-80 z-[1000] bg-white/95 backdrop-blur shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          Exploration Data Filters
          <Badge variant="outline">
            {commodities.length} commodities available
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="commodity-select">Target Commodity</Label>
          <select
            id="commodity-select"
            value={localFilters.commodity || 'all'}
            onChange={(e) => {
              const value = e.target.value;
              console.log('Commodity selection changed:', value);
              handleFilterChange('commodity', value === 'all' ? undefined : value);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Commodities</option>
            {commodities.map((commodity: string) => (
              <option key={commodity} value={commodity}>
                {commodity}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="year-from">From Year</Label>
            <input
              id="year-from"
              type="number"
              min="1970"
              max="2024"
              value={localFilters.yearFrom || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                console.log('Year From changed:', value);
                handleFilterChange('yearFrom', value);
              }}
              placeholder="1970"
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <Label htmlFor="year-to">To Year</Label>
            <input
              id="year-to"
              type="number"
              min="1970"
              max="2024"
              value={localFilters.yearTo || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                console.log('Year To changed:', value);
                handleFilterChange('yearTo', value);
              }}
              placeholder="2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="limit-select">Display Limit</Label>
          <select
            id="limit-select"
            value={localFilters.limit?.toString() || '2000'}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              console.log('Limit selection changed:', value);
              handleFilterChange('limit', value);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="500">500 reports</option>
            <option value="1000">1,000 reports</option>
            <option value="2000">2,000 reports</option>
            <option value="5000">5,000 reports</option>
            <option value="10000">10,000 reports</option>
            <option value="25000">25,000 reports</option>
            <option value="50000">50,000 reports</option>
            <option value="113850">All 113,850 reports</option>
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => {
              console.log('Apply button clicked with filters:', localFilters);
              applyFilters();
            }}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            type="button"
          >
            Apply Filters
          </Button>
          <Button 
            onClick={() => {
              console.log('Reset button clicked');
              resetFilters();
            }}
            variant="outline"
            type="button"
          >
            Reset
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <div>Data Source: WA Department of Mines</div>
          <div>Total Database: 113,850 exploration reports</div>
          <div>Timespan: 1970-2024</div>
        </div>
      </CardContent>
    </Card>
  );
}