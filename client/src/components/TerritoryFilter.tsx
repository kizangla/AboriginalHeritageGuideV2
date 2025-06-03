import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, MapPin, Filter } from 'lucide-react';

interface TerritoryFilterProps {
  onRegionFilter: (region: string | null) => void;
  selectedRegion: string | null;
  territoryStats: {
    total: number;
    kimberley: number;
    southeast: number;
    riverine: number;
  };
}

export default function TerritoryFilter({ 
  onRegionFilter, 
  selectedRegion, 
  territoryStats 
}: TerritoryFilterProps) {
  const [isOpen, setIsOpen] = useState(true);

  const regions = [
    {
      name: 'Kimberley',
      key: 'Kimberley',
      count: territoryStats.kimberley,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      description: 'Northwestern Australia - ancient landscapes and cultural sites'
    },
    {
      name: 'Southeast',
      key: 'Southeast', 
      count: territoryStats.southeast,
      color: 'bg-green-100 text-green-800 border-green-200',
      description: 'Southeastern regions with diverse Aboriginal groups'
    },
    {
      name: 'Riverine',
      key: 'Riverine',
      count: territoryStats.riverine,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'River systems and waterway territories'
    }
  ];

  return (
    <Card className="absolute top-4 left-4 z-[1000] w-80 bg-white/95 backdrop-blur-sm shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Aboriginal Territories
                <Badge variant="outline" className="ml-1">
                  {territoryStats.total}
                </Badge>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* All Territories Button */}
            <Button
              variant={selectedRegion === null ? "default" : "outline"}
              size="sm"
              onClick={() => onRegionFilter(null)}
              className="w-full justify-start"
            >
              <MapPin className="w-4 h-4 mr-2" />
              All Territories ({territoryStats.total})
            </Button>

            {/* Region Filters */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Filter by Region
              </div>
              
              {regions.map((region) => (
                <div key={region.key} className="space-y-1">
                  <Button
                    variant={selectedRegion === region.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => onRegionFilter(region.key)}
                    className="w-full justify-between text-left"
                  >
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 mr-2" />
                      {region.name}
                    </span>
                    <Badge className={region.color}>
                      {region.count}
                    </Badge>
                  </Button>
                  
                  {selectedRegion === region.key && (
                    <p className="text-xs text-gray-600 px-2 py-1 bg-gray-50 rounded">
                      {region.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Selected Region Info */}
            {selectedRegion && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Showing {regions.find(r => r.key === selectedRegion)?.count || 0} territories in {selectedRegion}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}