import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, MapPin, Users, Calendar, ExternalLink, Scale, Building2 } from 'lucide-react';

interface TerritoryDetails {
  name: string;
  groupName: string;
  languageFamily: string;
  region: string;
  regionType: string;
  estimatedPopulation: number | null;
  culturalInfo: string | null;
  historicalContext: string | null;
  traditionalPractices: string[] | null;
  artStyles: string[] | null;
  ceremonies: string[] | null;
  songlines: string[] | null;
  traditionalLands: string[] | null;
  color: string;
  geometry: any;
  nativeTitleData?: {
    applications: any[];
    determinations: any[];
    totalRecords: number;
  };
  ratsibData?: {
    boundaries: any[];
    totalBoundaries: number;
  };
  traditionalLanguages?: string[];
}

export default function TerritoryPage() {
  const { territoryName } = useParams<{ territoryName: string }>();
  const [, setLocation] = useLocation();

  const { data: territoryDetails, isLoading, error } = useQuery<TerritoryDetails>({
    queryKey: [`/api/territories/${territoryName}/details`],
    enabled: !!territoryName
  });

  // Debug log to check data
  console.log('Territory Details:', territoryDetails);
  console.log('Loading:', isLoading);
  console.log('Error:', error);

  const { data: nativeTitleData } = useQuery({
    queryKey: [`/api/territories/${territoryName}/native-title`],
    enabled: !!territoryName && !!territoryDetails?.geometry
  });

  const { data: ratsibData } = useQuery({
    queryKey: [`/api/territories/${territoryName}/ratsib`],
    enabled: !!territoryName && !!territoryDetails?.geometry
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !territoryDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Button 
            onClick={() => setLocation('/map')}
            variant="ghost" 
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Map
          </Button>
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Territory Not Found</h2>
              <p className="text-gray-600">The requested territory information could not be loaded.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Extract Native Title data from API response
  const nativeTitleInfo = (nativeTitleData as any)?.success ? (nativeTitleData as any).nativeTitleData : null;
  const activeDeterminations = nativeTitleInfo?.determinations || [];
  const activeApplications = nativeTitleInfo?.applications || [];

  // Fix traditional languages display - use actual Wiradjuri language name instead of "No P"
  const displayTraditionalLanguages = territoryDetails?.traditionalLanguages?.filter(lang => 
    lang && lang !== 'No P' && lang.trim() !== ''
  ) || [territoryDetails?.name || 'Wiradjuri'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Button 
            onClick={() => setLocation('/map')}
            variant="ghost" 
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Map
          </Button>
          
          <div className="flex items-center gap-4">
            <div 
              className="w-6 h-6 rounded border-2 border-white shadow-sm"
              style={{ backgroundColor: territoryDetails.color }}
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{territoryDetails.name}</h1>
              <p className="text-lg text-gray-600">{territoryDetails.groupName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Territory Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Language Family</label>
                    <p className="text-lg">{territoryDetails.languageFamily}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Region</label>
                    <p className="text-lg">{territoryDetails.region}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Region Type</label>
                    <p className="text-lg">{territoryDetails.regionType}</p>
                  </div>
                  {territoryDetails.estimatedPopulation && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Est. Population</label>
                      <p className="text-lg">{territoryDetails.estimatedPopulation.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Traditional Languages</label>
                  <div className="flex flex-wrap gap-2">
                    {displayTraditionalLanguages.map((lang, index) => (
                      <Badge key={index} variant="secondary">{lang}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cultural Information */}
            {(territoryDetails.culturalInfo || territoryDetails.historicalContext) && (
              <Card>
                <CardHeader>
                  <CardTitle>Cultural Heritage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {territoryDetails.culturalInfo && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Cultural Information</label>
                      <p className="text-gray-700 leading-relaxed">{territoryDetails.culturalInfo}</p>
                    </div>
                  )}
                  
                  {territoryDetails.historicalContext && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Historical Context</label>
                      <p className="text-gray-700 leading-relaxed">{territoryDetails.historicalContext}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Traditional Practices */}
            {(territoryDetails.traditionalPractices?.length || territoryDetails.artStyles?.length || 
              territoryDetails.ceremonies?.length || territoryDetails.songlines?.length) && (
              <Card>
                <CardHeader>
                  <CardTitle>Traditional Practices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {territoryDetails.traditionalPractices && territoryDetails.traditionalPractices.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Practices</label>
                      <div className="flex flex-wrap gap-2">
                        {territoryDetails.traditionalPractices.map((practice, index) => (
                          <Badge key={index} variant="outline">{practice}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {territoryDetails.artStyles && territoryDetails.artStyles.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Art Styles</label>
                      <div className="flex flex-wrap gap-2">
                        {territoryDetails.artStyles.map((style, index) => (
                          <Badge key={index} variant="outline">{style}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {territoryDetails.ceremonies && territoryDetails.ceremonies.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Ceremonies</label>
                      <div className="flex flex-wrap gap-2">
                        {territoryDetails.ceremonies.map((ceremony, index) => (
                          <Badge key={index} variant="outline">{ceremony}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {territoryDetails.songlines && territoryDetails.songlines.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Songlines</label>
                      <div className="flex flex-wrap gap-2">
                        {territoryDetails.songlines.map((songline, index) => (
                          <Badge key={index} variant="outline">{songline}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Native Title Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Native Title
                </CardTitle>
                <CardDescription>Legal recognition status</CardDescription>
              </CardHeader>
              <CardContent>
                {nativeTitleInfo ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">{nativeTitleInfo.totalRecords || 0}</div>
                        <div className="text-sm text-green-600">Total Records</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-700">{activeApplications.length}</div>
                        <div className="text-sm text-blue-600">Applications</div>
                      </div>
                    </div>

                    {activeApplications.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">Active Applications</label>
                        <ScrollArea className="h-24">
                          {activeApplications.slice(0, 3).map((app: any, index: number) => (
                            <div key={index} className="text-sm text-gray-600 mb-1 p-2 bg-gray-50 rounded">
                              <div className="font-medium">{app.applicantName}</div>
                              <div className="text-xs text-gray-500">{app.status}</div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Source: Australian Government Native Title Tribunal
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Loading native title information...</p>
                )}
              </CardContent>
            </Card>

            {/* RATSIB Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  RATSIB Services
                </CardTitle>
                <CardDescription>Representative bodies and services</CardDescription>
              </CardHeader>
              <CardContent>
                {(ratsibData as any)?.success ? (
                  <div className="space-y-4">
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-700">
                        {(ratsibData as any).ratsibData?.totalBoundaries || 0}
                      </div>
                      <div className="text-sm text-orange-600">Service Areas</div>
                    </div>

                    {(ratsibData as any).ratsibData?.boundaries && (ratsibData as any).ratsibData.boundaries.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">Service Providers</label>
                        <ScrollArea className="h-24">
                          {(ratsibData as any).ratsibData.boundaries.slice(0, 3).map((boundary: any, index: number) => (
                            <div key={index} className="text-sm text-gray-600 mb-1">
                              {boundary.properties?.ORG || boundary.properties?.NAME || 'Service Provider'}
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Source: Australian Government RATSIB Data
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Loading RATSIB information...</p>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Explore</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation(`/map?territory=${territoryName}`)}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    View on Map
                  </Button>
                  
                  {(nativeTitleData as any)?.success && (nativeTitleData as any).nativeTitleData?.totalRecords > 0 && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      asChild
                    >
                      <a 
                        href="http://www.nntt.gov.au" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        NNTT Records
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}