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
    
    // Check for properties.centerLat/centerLng (from database)
    if (props.properties && props.properties.centerLat && props.properties.centerLng) {
      return { lat: props.properties.centerLat, lng: props.properties.centerLng };
    }
    
    // Check for properties.lat/lng (common in GeoJSON features)
    if (props.properties && props.properties.lat && props.properties.lng) {
      return { lat: props.properties.lat, lng: props.properties.lng };
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

  // Debug logging - remove in production
  // console.log('Territory panel data:', { territoryName, coordinates, nativeTitleData });

  return (
    <Card className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-[1000] w-[calc(100vw-2rem)] sm:w-96 max-w-md bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 px-3 sm:px-6 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold text-gray-900 mb-1 truncate">
              {territoryName}
            </CardTitle>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                <MapPin className="w-3 h-3 mr-1" />
                <span className="truncate max-w-16 sm:max-w-none">{region}</span>
              </Badge>
              {groupName && (
                <Badge variant="outline" className="text-xs truncate max-w-20 sm:max-w-none">
                  {groupName}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/50 flex-shrink-0"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Cultural Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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
          <div className="space-y-2 p-2 sm:p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-orange-800 flex-wrap">
              <Shield className="w-4 h-4" />
              <span>Native Title Status</span>
              <Badge variant="outline" className="text-xs bg-white text-orange-700 border-orange-300">
                Government Verified
              </Badge>
            </div>
            
            {nativeTitleData.nativeTitle.hasNativeTitle ? (
              <div className="space-y-4">
                {/* Status */}
                <div className="text-sm text-gray-700">
                  <strong>Status:</strong> {nativeTitleData.nativeTitle.status}
                </div>
                
                {/* Traditional Owners Section */}
                {(() => {
                  // Extract all traditional owners from applications
                  const allTraditionalOwners = new Set<string>();
                  
                  // Add primary applicant if available
                  if (nativeTitleData.nativeTitle.primaryApplicant) {
                    allTraditionalOwners.add(nativeTitleData.nativeTitle.primaryApplicant);
                  }
                  
                  // Extract from all applications
                  if (nativeTitleData.nativeTitle.applications) {
                    nativeTitleData.nativeTitle.applications.forEach((app: any) => {
                      if (app.applicantName) {
                        allTraditionalOwners.add(app.applicantName);
                      }
                      if (app.traditionalOwners && Array.isArray(app.traditionalOwners)) {
                        app.traditionalOwners.forEach((owner: string) => allTraditionalOwners.add(owner));
                      }
                    });
                  }
                  
                  const ownersList = Array.from(allTraditionalOwners).filter(owner => owner && owner.trim());
                  
                  if (ownersList.length > 0) {
                    return (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 font-medium mb-2">Traditional Owners:</div>
                        <div className="space-y-1">
                          {ownersList.map((owner, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></span>
                              <span>{owner}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Cultural Significance */}
                {nativeTitleData.nativeTitle.culturalSignificance && (
                  <div className="text-xs text-gray-600 italic bg-orange-25 p-2 rounded border-l-4 border-orange-300">
                    {nativeTitleData.nativeTitle.culturalSignificance}
                  </div>
                )}

                {/* Native Title Applications */}
                {nativeTitleData.nativeTitle.applications && nativeTitleData.nativeTitle.applications.length > 0 && (
                  <div className="bg-white border border-orange-200 rounded-lg p-3">
                    <div className="text-xs text-gray-600 font-medium mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      {nativeTitleData.nativeTitle.applications.length} Native Title application(s) recorded
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {nativeTitleData.nativeTitle.applications.map((app: any, index: number) => (
                        <div key={index} className="p-2 bg-orange-25 rounded border border-orange-100">
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="font-medium text-gray-800">{app.applicantName}</div>
                            <div className="flex flex-col sm:flex-row sm:gap-3 text-gray-600">
                              {app.tribunalNumber && (
                                <div>Tribunal: {app.tribunalNumber}</div>
                              )}
                              {app.area && (
                                <div>{app.area.toLocaleString()} sq km</div>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs w-fit">
                              {app.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="w-4 h-4" />
                Native Title data requires government API credentials
              </div>
            )}
            
            <div className="text-xs text-gray-500 pt-2 border-t border-orange-200 space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                <strong>Source:</strong> 
                <span className="break-words">{nativeTitleData.dataSource}</span>
              </div>
              {nativeTitleData.nativeTitle.applications && nativeTitleData.nativeTitle.applications.length > 0 && nativeTitleData.nativeTitle.applications[0].references && (
                <div className="space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <strong>Data Provider:</strong> 
                    <span className="break-words">{nativeTitleData.nativeTitle.applications[0].references.dataProvider}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <strong>License:</strong> 
                    <span className="break-words text-xs">{nativeTitleData.nativeTitle.applications[0].references.licenseType}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <strong>Last Updated:</strong> 
                    <span>{nativeTitleData.nativeTitle.applications[0].references.lastUpdated}</span>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium text-xs">
                      View Full Citation
                    </summary>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono leading-relaxed break-words">
                      {nativeTitleData.nativeTitle.applications[0].references.citation}
                    </div>
                  </details>
                </div>
              )}
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