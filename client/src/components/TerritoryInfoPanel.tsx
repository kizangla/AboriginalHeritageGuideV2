import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Globe, Calendar, Leaf, X, Shield, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Territory } from '@shared/schema';

interface TerritoryInfoPanelProps {
  territory: Territory;
  onClose: () => void;
  onViewDetails: () => void;
}

export default function TerritoryInfoPanel({ 
  territory, 
  onClose, 
  onViewDetails 
}: TerritoryInfoPanelProps) {
  // Handle both new and existing data structures
  const territoryName = (territory as any).Name || territory.name;
  const region = (territory as any).Region || territory.region;
  const groupName = territory.groupName;
  const languageFamily = territory.languageFamily;
  const estimatedPopulation = territory.estimatedPopulation;
  const traditionalLanguages = territory.traditionalLanguages;

  // Extract coordinates from GeoJSON data for territories from the map
  const getCoordinates = () => {
    // Try database schema first
    if (territory.centerLat && territory.centerLng) {
      return { lat: territory.centerLat, lng: territory.centerLng };
    }
    
    // Extract from GeoJSON properties if available
    const props = (territory as any);
    if (props.lat && props.lng) {
      return { lat: props.lat, lng: props.lng };
    }
    
    // Calculate centroid from geometry if available
    if (props.geometry) {
      try {
        const coords = props.geometry.coordinates;
        if (coords && coords.length > 0) {
          // For polygon, take first coordinate pair
          const firstCoord = Array.isArray(coords[0]) ? coords[0][0] : coords[0];
          return { lat: firstCoord[1], lng: firstCoord[0] };
        }
      } catch (e) {
        console.warn('Failed to extract coordinates from geometry:', e);
      }
    }
    
    return null;
  };

  const coordinates = getCoordinates();

  // Fetch authentic Native Title data from Australian Government
  const { data: nativeTitleData, isLoading: nativeTitleLoading, error: nativeTitleError } = useQuery({
    queryKey: ['/api/territories', territoryName, 'native-title', coordinates?.lat, coordinates?.lng],
    queryFn: async () => {
      if (!coordinates) throw new Error('No coordinates available');
      const response = await fetch(`/api/territories/${encodeURIComponent(territoryName)}/native-title?lat=${coordinates.lat}&lng=${coordinates.lng}`);
      if (!response.ok) throw new Error('Failed to fetch Native Title data');
      const data = await response.json();
      console.log('Native Title data received:', data);
      return data;
    },
    enabled: !!(territoryName && coordinates?.lat && coordinates?.lng)
  });

  // Debug logging
  console.log('Territory panel data:', {
    territoryName,
    coordinates,
    nativeTitleData,
    nativeTitleLoading,
    nativeTitleError
  });

  return (
    <Card className="absolute bottom-6 right-6 z-[1000] w-96 bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-gray-900 mb-1">
              {territoryName}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                <MapPin className="w-3 h-3 mr-1" />
                {region}
              </Badge>
              {groupName && (
                <Badge variant="outline" className="text-xs">
                  {groupName}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-white/50"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Cultural Information Grid */}
        <div className="grid grid-cols-2 gap-3">
          {languageFamily && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
              <Globe className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-xs text-blue-600 font-medium">Language Family</div>
                <div className="text-sm text-gray-800">{languageFamily}</div>
              </div>
            </div>
          )}
          
          {estimatedPopulation && (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
              <Users className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-xs text-green-600 font-medium">Population</div>
                <div className="text-sm text-gray-800">{estimatedPopulation.toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>

        {/* Native Title Information - Australian Government Data */}
        {nativeTitleData && nativeTitleData.success && (
          <div className="space-y-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-800">
              <Shield className="w-4 h-4" />
              Native Title Status
              <Badge variant="outline" className="text-xs bg-white text-orange-700 border-orange-300">
                Government Verified
              </Badge>
            </div>
            
            {nativeTitleData.nativeTitle.hasNativeTitle ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-700">
                  <strong>Status:</strong> {nativeTitleData.nativeTitle.status}
                </div>
                {nativeTitleData.nativeTitle.primaryApplicant && (
                  <div className="text-sm text-gray-700">
                    <strong>Traditional Owners:</strong> {nativeTitleData.nativeTitle.primaryApplicant}
                  </div>
                )}
                {nativeTitleData.nativeTitle.applications && nativeTitleData.nativeTitle.applications.length > 0 && (
                  <div className="text-xs text-gray-600">
                    {nativeTitleData.nativeTitle.applications.length} Native Title application(s) recorded
                  </div>
                )}
                {nativeTitleData.nativeTitle.culturalSignificance && (
                  <div className="text-xs text-gray-600 italic">
                    {nativeTitleData.nativeTitle.culturalSignificance}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertCircle className="w-4 h-4" />
                No Native Title applications recorded for this area
              </div>
            )}
            
            <div className="text-xs text-gray-500 pt-1 border-t border-orange-200">
              Source: {nativeTitleData.dataSource}
            </div>
          </div>
        )}

        {nativeTitleLoading && (
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
              Loading Native Title information...
            </div>
          </div>
        )}

        {/* Traditional Languages */}
        {traditionalLanguages && traditionalLanguages.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Globe className="w-4 h-4" />
              Traditional Languages
            </div>
            <div className="flex flex-wrap gap-1">
              {traditionalLanguages.slice(0, 4).map((language, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-gray-50">
                  {language}
                </Badge>
              ))}
              {traditionalLanguages.length > 4 && (
                <Badge variant="outline" className="text-xs bg-gray-100">
                  +{traditionalLanguages.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Cultural Indicators */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Ancient Heritage
            </div>
            <div className="flex items-center gap-1">
              <Leaf className="w-3 h-3" />
              Traditional Knowledge
            </div>
          </div>
          
          <Button
            onClick={onViewDetails}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white px-4"
          >
            Learn More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}