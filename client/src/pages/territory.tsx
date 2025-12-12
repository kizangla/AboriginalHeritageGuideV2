import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, MapPin, Users, Calendar, ExternalLink, Scale, Building2, Pickaxe, Sparkles, AlertCircle, Mountain, FileText } from 'lucide-react';

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
  
  // State for commodity filtering on territory page - moved to top to fix hooks order
  const [selectedCommodity, setSelectedCommodity] = useState<string | null>(null);

  const { data: territoryDetails, isLoading, error } = useQuery<TerritoryDetails>({
    queryKey: [`/api/territories/${territoryName}/details`],
    enabled: !!territoryName
  });

  const { data: nativeTitleData, isLoading: nativeTitleLoading } = useQuery({
    queryKey: [`/api/territories/${territoryName}/native-title`],
    enabled: !!territoryName && !!territoryDetails?.geometry
  });

  const { data: ratsibData, isLoading: ratsibLoading } = useQuery({
    queryKey: [`/api/territories/${territoryName}/ratsib`],
    enabled: !!territoryName && !!territoryDetails?.geometry
  });

  const { data: explorationData, isLoading: explorationLoading } = useQuery({
    queryKey: [`/api/territories/${territoryName}/exploration`],
    enabled: !!territoryName && !!territoryDetails?.geometry
  });

  const { data: tenementsData, isLoading: tenementsLoading } = useQuery({
    queryKey: [`/api/territories/${territoryName}/mining-tenements`],
    enabled: !!territoryName && !!territoryDetails?.geometry
  });

  const { data: minedexData, isLoading: minedexLoading } = useQuery({
    queryKey: [`/api/territories/${territoryName}/minedex`],
    enabled: !!territoryName && !!territoryDetails?.geometry
  });

  const { data: wamexData, isLoading: wamexLoading } = useQuery({
    queryKey: [`/api/territories/${territoryName}/wamex`],
    enabled: !!territoryName && !!territoryDetails?.geometry
  });

  const { data: placeNamesData, isLoading: placeNamesLoading } = useQuery({
    queryKey: [`/api/territories/${territoryName}/place-names`],
    enabled: !!territoryName && !!territoryDetails?.geometry
  });

  const { data: aiContentData, isLoading: aiContentLoading } = useQuery({
    queryKey: [`/api/territories/${territoryName}/ai-content`],
    enabled: !!territoryName
  });

  // Debug log to check data
  console.log('Territory Details:', territoryDetails);
  console.log('Loading:', isLoading);
  console.log('Error:', error);
  console.log('Native Title Data:', nativeTitleData);
  console.log('RATSIB Data:', ratsibData);

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

  // Extract Native Title data from API response - fix data structure access
  const nativeTitleInfo = (nativeTitleData as any)?.success ? (nativeTitleData as any).nativeTitleData : null;
  
  // Use optimized backend categorization from Australian Government data
  const allRecords = nativeTitleInfo?.applications || [];
  
  // Categorize based on DETOUTCOME field from government data
  const activeDeterminations = allRecords.filter((record: any) => {
    const outcome = record.outcome || record.status || '';
    return outcome.includes('Native title exists') || outcome.includes('Native title does not exist');
  });
  
  const activeApplications = allRecords.filter((record: any) => {
    const outcome = record.outcome || record.status || '';
    return !outcome.includes('Native title exists') && !outcome.includes('Native title does not exist');
  });
  
  // Extract RATSIB data from API response - fix data structure access
  const ratsibInfo = (ratsibData as any)?.success ? (ratsibData as any).ratsibData : null;
  const ratsibBoundaries = ratsibInfo?.boundaries || [];

  // Extract exploration data from API response
  const explorationInfo = (explorationData as any)?.success ? (explorationData as any).explorationData : null;
  const explorationReports = explorationInfo?.reports || [];
  const commoditySummary = explorationInfo?.commoditySummary || [];

  // Extract mining tenements data from API response
  const tenementsInfo = (tenementsData as any)?.success ? (tenementsData as any).tenementsData : null;
  const tenementsList = tenementsInfo?.tenements || [];
  const tenementTypeSummary = tenementsInfo?.typeSummary || [];

  // Extract place names data from API response
  const placeNamesInfo = (placeNamesData as any)?.success ? (placeNamesData as any).placeNamesData : null;
  const aboriginalPlaces = placeNamesInfo?.places || [];

  // Extract AI-generated content
  const aiContent = (aiContentData as any)?.success ? (aiContentData as any).aiContent : null;

  // Filter exploration reports based on selected commodity - ensure matches backend logic
  const filteredExplorationReports = selectedCommodity 
    ? explorationReports.filter((report: any) => {
        if (!report.targetCommodity) return false;
        
        // Handle multiple commodities separated by semicolons or commas
        const commodities = report.targetCommodity
          .split(/[;,]/)
          .map((c: string) => c.trim().toUpperCase())
          .filter((c: string) => c && c.length > 0);
        
        // Check if any commodity matches the selected one
        return commodities.includes(selectedCommodity.toUpperCase());
      })
    : explorationReports;

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

            {/* AI-Researched Cultural Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Cultural Heritage
                  <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
                    Maali Group research findings
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Researched cultural information about {territoryDetails.name} territory
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiContentLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <p className="text-sm text-gray-500 mt-2">Researching cultural information...</p>
                  </div>
                ) : aiContent ? (
                  <>
                    {aiContent.languageFamily && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">Language Family</label>
                        <p className="text-gray-700">{aiContent.languageFamily}</p>
                      </div>
                    )}

                    {aiContent.traditionalLanguages && aiContent.traditionalLanguages.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">Traditional Languages</label>
                        <div className="flex flex-wrap gap-2">
                          {aiContent.traditionalLanguages.map((lang: string, index: number) => (
                            <Badge key={index} variant="secondary" className="bg-purple-50 text-purple-700">{lang}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiContent.culturalPractices && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">Cultural Practices</label>
                        <p className="text-gray-700 leading-relaxed">{aiContent.culturalPractices}</p>
                      </div>
                    )}
                    
                    {aiContent.historicalContext && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">Historical Context</label>
                        <p className="text-gray-700 leading-relaxed">{aiContent.historicalContext}</p>
                      </div>
                    )}

                    {aiContent.connectionToCountry && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">Connection to Country</label>
                        <p className="text-gray-700 leading-relaxed">{aiContent.connectionToCountry}</p>
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">This content was researched by independent consultants. While we strive for accuracy, this information should be verified with Traditional Owners.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>Cultural information is being researched...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Traditional Practices from AI */}
            {aiContent && (aiContent.traditionalPractices?.length > 0 || aiContent.artStyles?.length > 0 || 
              aiContent.ceremonies?.length > 0 || aiContent.songlines?.length > 0 || aiContent.traditionalFoods?.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Traditional Practices
                    <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
                      Maali Group research findings
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiContent.traditionalPractices && aiContent.traditionalPractices.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Practices</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.traditionalPractices.map((practice: string, index: number) => (
                          <Badge key={index} variant="outline">{practice}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiContent.artStyles && aiContent.artStyles.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Art Styles</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.artStyles.map((style: string, index: number) => (
                          <Badge key={index} variant="outline">{style}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiContent.ceremonies && aiContent.ceremonies.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Ceremonies</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.ceremonies.map((ceremony: string, index: number) => (
                          <Badge key={index} variant="outline">{ceremony}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiContent.songlines && aiContent.songlines.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Songlines</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.songlines.map((songline: string, index: number) => (
                          <Badge key={index} variant="outline">{songline}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiContent.traditionalFoods && aiContent.traditionalFoods.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Traditional Foods (Bush Tucker)</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.traditionalFoods.map((food: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">{food}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiContent.seasonalCalendar && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Seasonal Calendar</label>
                      <p className="text-gray-700 leading-relaxed">{aiContent.seasonalCalendar}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Social Structure & Kinship */}
            {aiContent && (aiContent.kinshipSystem || aiContent.moietySystem || aiContent.skinNames?.length > 0 || 
              aiContent.traditionalGovernance || aiContent.elderStructure) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Social Structure & Kinship
                    <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
                      Maali Group research findings
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiContent.kinshipSystem && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Kinship System</label>
                      <p className="text-gray-700 leading-relaxed">{aiContent.kinshipSystem}</p>
                    </div>
                  )}
                  {aiContent.moietySystem && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Moiety System</label>
                      <p className="text-gray-700 leading-relaxed">{aiContent.moietySystem}</p>
                    </div>
                  )}
                  {aiContent.skinNames && aiContent.skinNames.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Skin Names / Sections</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.skinNames.map((name: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiContent.traditionalGovernance && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Traditional Governance</label>
                      <p className="text-gray-700 leading-relaxed">{aiContent.traditionalGovernance}</p>
                    </div>
                  )}
                  {aiContent.elderStructure && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Role of Elders</label>
                      <p className="text-gray-700 leading-relaxed">{aiContent.elderStructure}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Environmental Knowledge & Land Management */}
            {aiContent && (aiContent.environmentalKnowledge || aiContent.landManagement || aiContent.waterKnowledge) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-500" />
                    Environmental Knowledge
                    <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
                      Maali Group research findings
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiContent.environmentalKnowledge && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Traditional Ecological Knowledge</label>
                      <p className="text-gray-700 leading-relaxed">{aiContent.environmentalKnowledge}</p>
                    </div>
                  )}
                  {aiContent.landManagement && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Land Management & Cultural Burning</label>
                      <p className="text-gray-700 leading-relaxed">{aiContent.landManagement}</p>
                    </div>
                  )}
                  {aiContent.waterKnowledge && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Water Knowledge</label>
                      <p className="text-gray-700 leading-relaxed">{aiContent.waterKnowledge}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Trade Networks & Connections */}
            {aiContent && (aiContent.tradeNetworks || aiContent.neighboringGroups?.length > 0 || aiContent.tradeGoods?.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Trade Networks & Connections
                    <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
                      Maali Group research findings
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiContent.tradeNetworks && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Trade Routes & Exchange</label>
                      <p className="text-gray-700 leading-relaxed">{aiContent.tradeNetworks}</p>
                    </div>
                  )}
                  {aiContent.neighboringGroups && aiContent.neighboringGroups.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Neighboring Groups</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.neighboringGroups.map((group: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{group}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiContent.tradeGoods && aiContent.tradeGoods.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Trade Goods</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.tradeGoods.map((good: string, index: number) => (
                          <Badge key={index} variant="outline">{good}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Music, Dance & Storytelling */}
            {aiContent && (aiContent.musicInstruments?.length > 0 || aiContent.danceStyles?.length > 0 || aiContent.storytellingTraditions) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Music, Dance & Storytelling
                    <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
                      Maali Group research findings
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiContent.musicInstruments && aiContent.musicInstruments.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Traditional Instruments</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.musicInstruments.map((instrument: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">{instrument}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiContent.danceStyles && aiContent.danceStyles.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Dance Traditions</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.danceStyles.map((dance: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">{dance}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiContent.storytellingTraditions && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Oral Traditions</label>
                      <p className="text-gray-700 leading-relaxed">{aiContent.storytellingTraditions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tools, Technology & Crafts */}
            {aiContent && (aiContent.toolsTechnology?.length > 0 || aiContent.weavingTextiles?.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Tools & Crafts
                    <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
                      Maali Group research findings
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiContent.toolsTechnology && aiContent.toolsTechnology.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Traditional Tools & Technology</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.toolsTechnology.map((tool: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">{tool}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiContent.weavingTextiles && aiContent.weavingTextiles.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Weaving & Textiles</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.weavingTextiles.map((item: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dreamtime & Significant Places */}
            {aiContent && (aiContent.dreamtimeBeings?.length > 0 || aiContent.significantSites?.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Dreamtime & Country
                    <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
                      Maali Group research findings
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiContent.dreamtimeBeings && aiContent.dreamtimeBeings.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Ancestral Beings</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.dreamtimeBeings.map((being: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">{being}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiContent.significantSites && aiContent.significantSites.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Types of Significant Places</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.significantSites.map((site: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">{site}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contemporary Culture */}
            {aiContent && (aiContent.contemporaryCulture || aiContent.languageRevival || 
              aiContent.culturalCentres?.length > 0 || aiContent.notableFigures?.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    Contemporary Culture
                    <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
                      Maali Group research findings
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiContent.contemporaryCulture && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Keeping Culture Strong</label>
                      <p className="text-gray-700 leading-relaxed">{aiContent.contemporaryCulture}</p>
                    </div>
                  )}
                  {aiContent.languageRevival && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Language Revival</label>
                      <p className="text-gray-700 leading-relaxed">{aiContent.languageRevival}</p>
                    </div>
                  )}
                  {aiContent.culturalCentres && aiContent.culturalCentres.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Cultural Centres & Keeping Places</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.culturalCentres.map((centre: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">{centre}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiContent.notableFigures && aiContent.notableFigures.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Notable Figures</label>
                      <div className="flex flex-wrap gap-2">
                        {aiContent.notableFigures.map((figure: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">{figure}</Badge>
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
                {nativeTitleLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-pulse">Loading native title data...</div>
                  </div>
                ) : nativeTitleInfo ? (
                  <div className="space-y-4">
                    {nativeTitleInfo.totalRecords === 0 && activeApplications.length === 0 && activeDeterminations.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Government Service Temporarily Unavailable</p>
                            <p className="text-xs text-amber-700 mt-1">
                              The Australian Government Native Title Tribunal API is currently experiencing issues. 
                              Data will be available once the service is restored.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">{nativeTitleInfo.totalRecords || (activeApplications.length + activeDeterminations.length)}</div>
                        <div className="text-sm text-green-600">Total Records</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-700">{activeApplications.length}</div>
                        <div className="text-sm text-blue-600">Applications</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-700">{activeDeterminations.length}</div>
                        <div className="text-sm text-purple-600">Determinations</div>
                      </div>
                    </div>
                    )}

                    {(activeApplications.length > 0 || activeDeterminations.length > 0) && (
                      <div className="space-y-4">
                        {activeApplications.length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-gray-500 mb-2 block">
                              Active Applications
                            </label>
                            <ScrollArea className="h-32">
                              {activeApplications.map((app: any, index: number) => (
                                <div key={index} className="text-sm text-gray-600 mb-2 p-3 bg-blue-50 rounded-lg border-l-3 border-blue-400">
                                  <div className="font-semibold text-gray-800">{app.applicantName}</div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    <span className="font-medium">File:</span> {app.tribunalNumber || app.applicationId}
                                  </div>
                                  <div className="text-xs mt-1">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                      {app.status}
                                    </span>
                                  </div>
                                  {app.outcome && (
                                    <div className="text-xs text-green-600 mt-1 font-medium">{app.outcome}</div>
                                  )}
                                  {app.area && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Area: {app.area} km²
                                    </div>
                                  )}
                                </div>
                              ))}
                            </ScrollArea>
                          </div>
                        )}

                        {activeDeterminations.length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-gray-500 mb-2 block">
                              Determinations ({activeDeterminations.length} records)
                            </label>
                            <ScrollArea className="h-96">
                              {activeDeterminations.map((det: any, index: number) => (
                                <div key={index} className="text-sm text-gray-600 mb-2 p-3 bg-green-50 rounded-lg border-l-3 border-green-400">
                                  <div className="font-semibold text-gray-800">
                                    {det.name || det.applicantName || det.claim_name || 'Native Title Determination'}
                                  </div>
                                  {det.tribunalNumber && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      <span className="font-medium">File:</span> {det.tribunalNumber}
                                    </div>
                                  )}
                                  {det.outcome && (
                                    <div className="text-xs mt-1">
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                        {det.outcome}
                                      </span>
                                    </div>
                                  )}
                                  {det.area && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Area: {det.area} km²
                                    </div>
                                  )}
                                </div>
                              ))}
                            </ScrollArea>
                          </div>
                        )}
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

            {/* Exploration Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pickaxe className="w-5 h-5" />
                  Exploration Reports
                </CardTitle>
                <CardDescription>WA DMIRS exploration data within territory</CardDescription>
              </CardHeader>
              <CardContent>
                {explorationLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-pulse">Loading exploration data...</div>
                  </div>
                ) : explorationInfo ? (
                  <div className="space-y-4">
                    {explorationInfo.totalReports === 0 ? (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">No Exploration Reports Available</p>
                            <p className="text-xs text-gray-600 mt-1">
                              Exploration data is currently only available for territories in Western Australia (WA DMIRS database).
                              This territory may be outside WA or have no registered exploration activity.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-700">
                        {explorationInfo.totalReports}
                      </div>
                      <div className="text-sm text-yellow-600">Exploration Reports</div>
                    </div>

                    {commoditySummary.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-500">
                            Commodities Explored in Territory
                          </label>
                          {selectedCommodity && (
                            <button
                              onClick={() => setSelectedCommodity(null)}
                              className="text-xs text-gray-400 hover:text-gray-600 underline"
                            >
                              Clear Filter
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {commoditySummary.slice(0, 6).map((item: any, index: number) => (
                            <button
                              key={index}
                              onClick={() => setSelectedCommodity(
                                selectedCommodity === item.commodity ? null : item.commodity
                              )}
                              className={`flex justify-between items-center p-2 rounded transition-colors ${
                                selectedCommodity === item.commodity
                                  ? 'bg-yellow-200 border-2 border-yellow-400'
                                  : 'bg-yellow-50 hover:bg-yellow-100 border-2 border-transparent'
                              }`}
                            >
                              <span className="text-sm font-medium text-yellow-800">{item.commodity}</span>
                              <span className="text-xs bg-yellow-200 text-yellow-700 px-2 py-1 rounded">
                                {item.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredExplorationReports.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">
                          {selectedCommodity ? `${selectedCommodity} Exploration Reports` : 'Recent Exploration Reports'}
                          <span className="text-xs text-gray-400 ml-2">
                            ({filteredExplorationReports.length} reports)
                          </span>
                        </label>
                        <ScrollArea className="h-48">
                          {filteredExplorationReports.map((report: any, index: number) => (
                            <div key={index} className="text-sm text-gray-600 mb-3 p-3 bg-yellow-50 rounded-lg border-l-3 border-yellow-400">
                              <div className="font-semibold text-gray-800 mb-1">
                                {report.project}
                              </div>
                              
                              <div className="space-y-1">
                                <div className="text-xs">
                                  <span className="font-medium">Operator:</span> {report.operator}
                                </div>
                                
                                <div className="text-xs">
                                  <span className="font-medium">Commodities:</span> {report.targetCommodity}
                                </div>
                                
                                <div className="text-xs">
                                  <span className="font-medium">Report Year:</span> 
                                  <span className="ml-1 px-2 py-0.5 bg-yellow-200 text-yellow-700 rounded text-xs">
                                    {report.reportYear}
                                  </span>
                                </div>
                                
                                <div className="text-xs text-green-600 mt-1">
                                  WA DMIRS Report #{report.id}
                                </div>
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t text-center">
                      <div className="text-xs text-gray-500">
                        Authentic data from WA Department of Mines
                      </div>
                    </div>
                    </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No exploration data available for this territory
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mining Tenements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="tenements-title">
                  <Scale className="w-5 h-5" />
                  Mining Tenements
                </CardTitle>
                <CardDescription>WA DMIRS mining lease and licence data</CardDescription>
              </CardHeader>
              <CardContent>
                {tenementsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-pulse">Loading mining tenements...</div>
                  </div>
                ) : tenementsInfo ? (
                  <div className="space-y-4">
                    {tenementsInfo.message ? (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Outside WA Coverage</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {tenementsInfo.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : !tenementsInfo.serviceAvailable ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Service Temporarily Unavailable</p>
                            <p className="text-xs text-amber-700 mt-1">
                              The WA DMIRS mining tenements service is currently experiencing issues.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : tenementsInfo.totalTenements === 0 ? (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">No Active Tenements</p>
                            <p className="text-xs text-gray-600 mt-1">
                              No mining tenements found within this territory's boundaries.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <>
                    <div className="text-center p-3 bg-purple-50 rounded-lg" data-testid="tenements-count">
                      <div className="text-2xl font-bold text-purple-700">
                        {tenementsInfo.totalTenements}
                      </div>
                      <div className="text-sm text-purple-600">Active Mining Tenements</div>
                    </div>

                    {tenementTypeSummary.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">
                          Tenement Types
                        </label>
                        <div className="grid grid-cols-1 gap-2 mb-4">
                          {tenementTypeSummary.map((item: any, index: number) => (
                            <div
                              key={index}
                              className="flex justify-between items-center p-2 rounded bg-purple-50"
                              data-testid={`tenement-type-${index}`}
                            >
                              <span className="text-sm font-medium text-purple-800">{item.type}</span>
                              <span className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded">
                                {item.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {tenementsList.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">
                          Recent Tenements
                          <span className="text-xs text-gray-400 ml-2">
                            (showing {Math.min(tenementsList.length, 10)} of {tenementsList.length})
                          </span>
                        </label>
                        <ScrollArea className="h-48">
                          {tenementsList.slice(0, 10).map((tenement: any, index: number) => (
                            <div 
                              key={index} 
                              className="text-sm text-gray-600 mb-3 p-3 bg-purple-50 rounded-lg border-l-3 border-purple-400"
                              data-testid={`tenement-item-${index}`}
                            >
                              <div className="font-semibold text-gray-800 mb-1">
                                {tenement.tenementId}
                              </div>
                              
                              <div className="space-y-1">
                                <div className="text-xs">
                                  <span className="font-medium">Type:</span> {tenement.type}
                                </div>
                                
                                <div className="text-xs">
                                  <span className="font-medium">Status:</span> 
                                  <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                                    tenement.status === 'LIVE' 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {tenement.status}
                                  </span>
                                </div>
                                
                                {tenement.holders && tenement.holders.length > 0 && (
                                  <div className="text-xs">
                                    <span className="font-medium">Holder:</span> {tenement.holders[0].name}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t text-center">
                      <div className="text-xs text-gray-500">
                        Authentic data from WA Department of Mines (DMIRS)
                      </div>
                    </div>
                    </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No mining tenement data available for this territory
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MINEDEX - Mines and Mineral Deposits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mountain className="w-5 h-5" />
                  Mines & Mineral Deposits
                </CardTitle>
                <CardDescription>WA MINEDEX database - mines, deposits, and prospects</CardDescription>
              </CardHeader>
              <CardContent>
                {minedexLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-pulse">Loading MINEDEX data...</div>
                  </div>
                ) : (minedexData as any)?.minedexData ? (
                  <div className="space-y-4" data-testid="minedex-section">
                    {(minedexData as any).minedexData.message ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Outside WA Coverage</p>
                            <p className="text-xs text-amber-700 mt-1">
                              {(minedexData as any).minedexData.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <>
                    <div className="text-center p-3 bg-teal-50 rounded-lg" data-testid="minedex-count">
                      <div className="text-2xl font-bold text-teal-700">
                        {(minedexData as any).minedexData.totalSites}
                      </div>
                      <div className="text-sm text-teal-600">Mines & Deposits</div>
                    </div>

                    {(minedexData as any).minedexData.typeSummary?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">
                          By Site Type
                        </label>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {(minedexData as any).minedexData.typeSummary.slice(0, 6).map((item: any, index: number) => (
                            <div
                              key={index}
                              className="flex justify-between items-center p-2 rounded bg-teal-50"
                              data-testid={`minedex-type-${index}`}
                            >
                              <span className="text-xs font-medium text-teal-800 truncate">{item.type}</span>
                              <span className="text-xs bg-teal-200 text-teal-700 px-2 py-0.5 rounded ml-1">
                                {item.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(minedexData as any).minedexData.commoditySummary?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">
                          By Commodity
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(minedexData as any).minedexData.commoditySummary.slice(0, 8).map((item: any, index: number) => (
                            <span
                              key={index}
                              className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded"
                              data-testid={`minedex-commodity-${index}`}
                            >
                              {item.commodity} ({item.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(minedexData as any).minedexData.sites?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">
                          Recent Sites
                          <span className="text-xs text-gray-400 ml-2">
                            (showing {Math.min((minedexData as any).minedexData.sites.length, 8)} of {(minedexData as any).minedexData.sites.length})
                          </span>
                        </label>
                        <ScrollArea className="h-48">
                          {(minedexData as any).minedexData.sites.slice(0, 8).map((site: any, index: number) => (
                            <div 
                              key={index} 
                              className="text-sm text-gray-600 mb-3 p-3 bg-teal-50 rounded-lg border-l-3 border-teal-400"
                              data-testid={`minedex-site-${index}`}
                            >
                              <div className="font-semibold text-gray-800 mb-1">
                                {site.shortName || site.siteTitle}
                              </div>
                              
                              <div className="space-y-1">
                                <div className="text-xs">
                                  <span className="font-medium">Code:</span> {site.siteCode}
                                </div>
                                
                                <div className="text-xs">
                                  <span className="font-medium">Type:</span> {site.siteType}
                                  {site.siteSubType && ` (${site.siteSubType})`}
                                </div>
                                
                                <div className="text-xs">
                                  <span className="font-medium">Stage:</span> 
                                  <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                                    site.siteStage === 'Operating' 
                                      ? 'bg-green-100 text-green-700' 
                                      : site.siteStage === 'Care and Maintenance'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {site.siteStage}
                                  </span>
                                </div>
                                
                                {site.siteCommodities && (
                                  <div className="text-xs">
                                    <span className="font-medium">Commodities:</span> {site.siteCommodities}
                                  </div>
                                )}

                                {site.webLink && (
                                  <a 
                                    href={site.webLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-teal-600 hover:underline flex items-center gap-1 mt-1"
                                    data-testid={`minedex-link-${index}`}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    View on MINEDEX
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t text-center">
                      <div className="text-xs text-gray-500">
                        Authentic data from WA Department of Mines (DMIRS) MINEDEX
                      </div>
                    </div>
                    </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No mine or deposit data available for this territory
                  </div>
                )}
              </CardContent>
            </Card>

            {/* WAMEX - Mineral Exploration Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Exploration Reports
                </CardTitle>
                <CardDescription>WA WAMEX database - statutory mineral exploration reports</CardDescription>
              </CardHeader>
              <CardContent>
                {wamexLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-pulse">Loading WAMEX reports...</div>
                  </div>
                ) : (wamexData as any)?.wamexData ? (
                  <div className="space-y-4" data-testid="wamex-section">
                    {(wamexData as any).wamexData.message ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Outside WA Coverage</p>
                            <p className="text-xs text-amber-700 mt-1">
                              {(wamexData as any).wamexData.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg" data-testid="wamex-count">
                      <div className="text-2xl font-bold text-indigo-700">
                        {(wamexData as any).wamexData.totalReports}
                      </div>
                      <div className="text-sm text-indigo-600">Exploration Reports</div>
                    </div>

                    {(wamexData as any).wamexData.typeSummary?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">
                          By Report Type
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(wamexData as any).wamexData.typeSummary.slice(0, 6).map((item: any, index: number) => (
                            <span
                              key={index}
                              className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded"
                              data-testid={`wamex-type-${index}`}
                            >
                              {item.type} ({item.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(wamexData as any).wamexData.commoditySummary?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">
                          By Target Commodity
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(wamexData as any).wamexData.commoditySummary.slice(0, 8).map((item: any, index: number) => (
                            <span
                              key={index}
                              className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded"
                              data-testid={`wamex-commodity-${index}`}
                            >
                              {item.commodity} ({item.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(wamexData as any).wamexData.decadeSummary?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">
                          By Decade
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(wamexData as any).wamexData.decadeSummary.slice(0, 6).map((item: any, index: number) => (
                            <span
                              key={index}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                              data-testid={`wamex-decade-${index}`}
                            >
                              {item.decade} ({item.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(wamexData as any).wamexData.reports?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">
                          Recent Reports
                          <span className="text-xs text-gray-400 ml-2">
                            (showing {Math.min((wamexData as any).wamexData.reports.length, 6)} of {(wamexData as any).wamexData.reports.length})
                          </span>
                        </label>
                        <ScrollArea className="h-48">
                          {(wamexData as any).wamexData.reports.slice(0, 6).map((report: any, index: number) => (
                            <div 
                              key={index} 
                              className="text-sm text-gray-600 mb-3 p-3 bg-indigo-50 rounded-lg border-l-3 border-indigo-400"
                              data-testid={`wamex-report-${index}`}
                            >
                              <div className="font-semibold text-gray-800 mb-1 line-clamp-2">
                                {report.project || report.title}
                              </div>
                              
                              <div className="space-y-1">
                                <div className="text-xs">
                                  <span className="font-medium">Year:</span> {report.reportYear}
                                  {report.reportType && ` - ${report.reportType}`}
                                </div>
                                
                                {report.operator && (
                                  <div className="text-xs">
                                    <span className="font-medium">Operator:</span> {report.operator}
                                  </div>
                                )}
                                
                                {report.targetCommodity && (
                                  <div className="text-xs">
                                    <span className="font-medium">Target:</span> {report.targetCommodity}
                                  </div>
                                )}

                                <div className="flex gap-2 mt-2">
                                  {report.abstractUrl && (
                                    <a 
                                      href={report.abstractUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                                      data-testid={`wamex-abstract-${index}`}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Abstract
                                    </a>
                                  )}
                                  {report.reportUrl && (
                                    <a 
                                      href={report.reportUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                                      data-testid={`wamex-report-link-${index}`}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Full Report
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t text-center">
                      <div className="text-xs text-gray-500">
                        Authentic data from WA Department of Mines (DMIRS) WAMEX
                      </div>
                    </div>
                    </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No exploration report data available for this territory
                  </div>
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
                {ratsibLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-pulse">Loading RATSIB data...</div>
                  </div>
                ) : ratsibInfo ? (
                  <div className="space-y-4">
                    {ratsibBoundaries.length === 0 && (ratsibInfo.totalFound === 0 || ratsibInfo.totalBoundaries === 0 || (!ratsibInfo.totalFound && !ratsibInfo.totalBoundaries)) ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Government Service Temporarily Unavailable</p>
                            <p className="text-xs text-amber-700 mt-1">
                              The RATSIB (Regional Aboriginal and Torres Strait Islander Bodies) WFS service is currently experiencing issues.
                              Data will be available once the service is restored.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-700">
                        {ratsibInfo.totalFound || ratsibInfo.totalBoundaries || ratsibBoundaries.length}
                      </div>
                      <div className="text-sm text-orange-600">Service Areas</div>
                    </div>

                    {ratsibBoundaries.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">
                          Service Providers Covering This Region
                        </label>
                        <ScrollArea className="h-40">
                          {ratsibBoundaries.map((boundary: any, index: number) => {
                            const props = boundary.properties || {};
                            return (
                              <div key={index} className="text-sm text-gray-600 mb-3 p-3 bg-gray-50 rounded-lg border-l-3 border-orange-400">
                                <div className="font-semibold text-gray-800 mb-1">
                                  {boundary.organizationName || props.organizationName || 'Aboriginal Organization'}
                                </div>
                                
                                <div className="space-y-1">
                                  {(boundary.name || props.name) && (
                                    <div className="text-xs">
                                      <span className="font-medium">Coverage:</span> {boundary.name || props.name}
                                    </div>
                                  )}
                                  
                                  <div className="text-xs">
                                    <span className="font-medium">Type:</span> 
                                    <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                                      {boundary.corporationType || props.corporationType || 'Native Title Service Provider'}
                                    </span>
                                  </div>
                                  
                                  {(boundary.jurisdiction || props.jurisdiction) && (
                                    <div className="text-xs">
                                      <span className="font-medium">Jurisdiction:</span> 
                                      <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                        {boundary.jurisdiction || props.jurisdiction}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {(boundary.legislativeAuthority || props.legislativeAuthority) && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      <span className="font-medium">Authority:</span> {boundary.legislativeAuthority || props.legislativeAuthority}
                                    </div>
                                  )}
                                  
                                  {(boundary.website || props.website) && (
                                    <div className="text-xs mt-1">
                                      <a 
                                        href={boundary.website || props.website} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline"
                                      >
                                        Visit Website
                                      </a>
                                    </div>
                                  )}
                                  
                                  {(boundary.status || props.status) && (
                                    <div className="text-xs text-amber-600 mt-1 italic">
                                      {boundary.status || props.status}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </ScrollArea>
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Source: Australian Government RATSIB Data
                    </div>
                    </>
                    )}
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