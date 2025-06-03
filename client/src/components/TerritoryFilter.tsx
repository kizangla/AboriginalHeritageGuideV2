import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, MapPin, Filter } from 'lucide-react';

interface TerritoryFilterProps {
  onRegionFilter: (region: string | null) => void;
  selectedRegion: string | null;
  territoryStats: any;
}

export default function TerritoryFilter({ 
  onRegionFilter, 
  selectedRegion, 
  territoryStats 
}: TerritoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Group regions by significance and geography
  const majorRegions = [
    {
      name: 'Tasmania',
      key: 'Tasmania',
      count: territoryStats.tasmania || 0,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: 'Island territories of Tasmania with unique cultural heritage'
    },
    {
      name: 'Northwest',
      key: 'Northwest',
      count: territoryStats.northwest || 0,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      description: 'Northwestern Australia territories'
    },
    {
      name: 'Gulf',
      key: 'Gulf',
      count: territoryStats.gulf || 0,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Gulf region territories'
    },
    {
      name: 'Riverine',
      key: 'Riverine',
      count: territoryStats.riverine || 0,
      color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      description: 'River systems and waterway territories'
    }
  ];

  const otherRegions = [
    { name: 'Desert', key: 'Desert', count: territoryStats.desert || 0, color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { name: 'Kimberley', key: 'Kimberley', count: territoryStats.kimberley || 0, color: 'bg-red-100 text-red-800 border-red-200' },
    { name: 'Southeast', key: 'Southeast', count: territoryStats.southeast || 0, color: 'bg-green-100 text-green-800 border-green-200' },
    { name: 'Northeast', key: 'Northeast', count: territoryStats.northeast || 0, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    { name: 'Eyre', key: 'Eyre', count: territoryStats.eyre || 0, color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { name: 'Fitzmaurice', key: 'Fitzmaurice', count: territoryStats.fitzmaurice || 0, color: 'bg-pink-100 text-pink-800 border-pink-200' },
    { name: 'Arnhem', key: 'Arnhem', count: territoryStats.arnhem || 0, color: 'bg-teal-100 text-teal-800 border-teal-200' },
    { name: 'Southwest', key: 'Southwest', count: territoryStats.southwest || 0, color: 'bg-violet-100 text-violet-800 border-violet-200' }
  ];

  return (
    <Card className="absolute top-20 left-4 z-[1000] w-72 bg-white/95 backdrop-blur-sm shadow-lg max-h-[calc(100vh-200px)] overflow-y-auto">
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
            <div className="space-y-3">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Major Regions
              </div>
              
              {majorRegions.map((region) => (
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
                  
                  {selectedRegion === region.key && region.description && (
                    <p className="text-xs text-gray-600 px-2 py-1 bg-gray-50 rounded">
                      {region.description}
                    </p>
                  )}
                </div>
              ))}

              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-2 border-t border-gray-200">
                Other Regions
              </div>
              
              <div className="grid grid-cols-2 gap-1">
                {otherRegions.map((region) => (
                  <Button
                    key={region.key}
                    variant={selectedRegion === region.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => onRegionFilter(region.key)}
                    className="text-xs justify-between"
                  >
                    <span className="truncate">{region.name}</span>
                    <Badge className={`${region.color} text-xs px-1`}>
                      {region.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            {/* Selected Region Info */}
            {selectedRegion && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Showing {territoryStats[selectedRegion.toLowerCase()] || 0} territories in {selectedRegion}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}