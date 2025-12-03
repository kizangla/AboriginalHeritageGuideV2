import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Pickaxe, MapPin, Building2, BookOpen, Sparkles, Languages, Utensils, Palette } from 'lucide-react';
import type { Territory } from '@shared/schema';

interface MiningDeposit {
  id: string;
  name: string;
  state: string;
  commodities: string[];
  status: string;
  coordinates: { lat: number; lng: number };
}

interface MiningImpact {
  deposits: MiningDeposit[];
  totalCount: number;
  commodityBreakdown: Record<string, number>;
}

interface AICulturalContent {
  aiContent: {
    languageFamily: string;
    traditionalLanguages: string[];
    culturalPractices: string;
    connectionToCountry: string;
    traditionalFoods: string[];
    artStyles: string[];
    disclaimer: string;
    isAIGenerated: boolean;
  };
}

interface InfoPanelProps {
  selectedTerritory: Territory | null;
  onShowModal: () => void;
}

export default function InfoPanel({ selectedTerritory, onShowModal }: InfoPanelProps) {
  const [showMiningDetails, setShowMiningDetails] = useState(false);
  const [showCulturalDetails, setShowCulturalDetails] = useState(false);
  
  const { data: businesses } = useQuery({
    queryKey: ['/api/territories', selectedTerritory?.id, 'businesses'],
    enabled: !!selectedTerritory,
  });
  
  const { data: miningImpact, isLoading: miningLoading } = useQuery<MiningImpact>({
    queryKey: ['/api/territories', selectedTerritory?.id, 'mining-impact'],
    enabled: !!selectedTerritory,
  });
  
  const { data: aiContent, isLoading: aiLoading } = useQuery<AICulturalContent>({
    queryKey: ['/api/territories', encodeURIComponent(selectedTerritory?.name || ''), 'ai-content'],
    enabled: !!selectedTerritory?.name,
  });

  if (!selectedTerritory) {
    return (
      <Card className="info-panel absolute top-5 right-5 z-[1000] max-w-[350px] bg-earth-beige/95 backdrop-blur-sm border-earth-brown/20 shadow-lg">
        <div className="p-5">
          <h3 className="font-serif font-bold text-earth-brown mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-earth-gold" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            </svg>
            Territory Information
          </h3>
          
          <div className="text-center py-8 text-earth-dark/60">
            <img 
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
              alt="Australian landscape with rolling hills" 
              className="rounded-lg mb-4 w-full h-32 object-cover"
            />
            <svg className="w-12 h-12 mx-auto mb-2 text-earth-peru" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M6,20H15L6,4V20Z"/>
            </svg>
            <p className="font-semibold">Click on a territory</p>
            <p className="text-sm">to learn about Aboriginal groups and their connection to country</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="info-panel absolute top-5 right-5 z-[1000] max-w-[350px] bg-earth-beige/95 backdrop-blur-sm border-earth-brown/20 shadow-lg">
      <div className="p-5">
        <h3 className="font-serif font-bold text-earth-brown mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-earth-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
          </svg>
          Territory Information
        </h3>
        
        <div className="space-y-4">
          <div className="territory-info bg-earth-beige/90 rounded-lg p-4 border-l-4 border-earth-brown">
            <h4 className="font-serif font-bold text-earth-brown mb-2 flex items-center">
              <div 
                className="w-4 h-4 rounded mr-2" 
                style={{ backgroundColor: selectedTerritory.color }}
              ></div>
              {selectedTerritory.name}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">Aboriginal Group:</span>
                <span>{selectedTerritory.groupName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Language:</span>
                <span>{selectedTerritory.languageFamily}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Region:</span>
                <span>{selectedTerritory.region}</span>
              </div>
              {selectedTerritory.estimatedPopulation && (
                <div className="flex justify-between">
                  <span className="font-semibold">Est. Population:</span>
                  <span>{selectedTerritory.estimatedPopulation.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mining Impact Analysis */}
          <Collapsible open={showMiningDetails} onOpenChange={setShowMiningDetails}>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
              <CollapsibleTrigger className="w-full" data-testid="trigger-mining-impact">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pickaxe className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                      Mining Impact
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {miningLoading ? (
                      <span className="text-xs text-amber-600">Loading...</span>
                    ) : miningImpact && miningImpact.totalCount > 0 ? (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                        {miningImpact.totalCount} deposit{miningImpact.totalCount !== 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                        No deposits
                      </Badge>
                    )}
                    {showMiningDetails ? (
                      <ChevronUp className="w-4 h-4 text-amber-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-3">
                {miningImpact && miningImpact.totalCount > 0 ? (
                  <div className="space-y-3">
                    {/* Alert about mining activity */}
                    <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/50 p-2 rounded">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Mining activity detected on traditional lands. Community consultation may be required.</span>
                    </div>
                    
                    {/* Commodity breakdown */}
                    {miningImpact.commodityBreakdown && Object.keys(miningImpact.commodityBreakdown).length > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-amber-800">Resources:</span>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(miningImpact.commodityBreakdown).slice(0, 6).map(([commodity, count]) => (
                            <Badge 
                              key={commodity} 
                              variant="secondary" 
                              className="text-xs bg-amber-200/50 text-amber-900"
                              data-testid={`badge-commodity-${commodity.toLowerCase()}`}
                            >
                              {commodity}: {String(count)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Top deposits list */}
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      <span className="text-xs font-medium text-amber-800">Key Sites:</span>
                      {miningImpact.deposits.slice(0, 3).map((deposit) => (
                        <div 
                          key={deposit.id} 
                          className="text-xs p-1.5 bg-white dark:bg-amber-900/30 rounded flex items-center gap-2"
                          data-testid={`deposit-${deposit.id}`}
                        >
                          <MapPin className="w-3 h-3 text-amber-600" />
                          <span className="font-medium truncate">{deposit.name}</span>
                          <span className="text-amber-600">({deposit.status})</span>
                        </div>
                      ))}
                      {miningImpact.totalCount > 3 && (
                        <div className="text-xs text-amber-600 pl-5">
                          + {miningImpact.totalCount - 3} more deposits
                        </div>
                      )}
                    </div>
                    
                    {/* Data source note */}
                    <div className="text-[10px] text-amber-600 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Source: Geoscience Australia
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-green-700 dark:text-green-300">
                    No recorded mining deposits found within this territory boundary.
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* AI Cultural Content */}
          <Collapsible open={showCulturalDetails} onOpenChange={setShowCulturalDetails}>
            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <CollapsibleTrigger className="w-full" data-testid="trigger-cultural-content">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                      Cultural Information
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiLoading ? (
                      <span className="text-xs text-purple-600">Researching...</span>
                    ) : aiContent?.aiContent ? (
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Researched
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                        Click to load
                      </Badge>
                    )}
                    {showCulturalDetails ? (
                      <ChevronUp className="w-4 h-4 text-purple-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-3">
                {aiContent?.aiContent ? (
                  <div className="space-y-3">
                    {/* AI Disclaimer */}
                    <div className="flex items-start gap-2 text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 p-2 rounded">
                      <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>AI-researched information. Please verify with Traditional Owners and official cultural resources.</span>
                    </div>
                    
                    {/* Language */}
                    {aiContent.aiContent.languageFamily && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-purple-800">
                          <Languages className="w-3 h-3" />
                          Language
                        </div>
                        <p className="text-xs text-purple-900 dark:text-purple-100">
                          {aiContent.aiContent.languageFamily}
                        </p>
                      </div>
                    )}
                    
                    {/* Connection to Country */}
                    {aiContent.aiContent.connectionToCountry && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-purple-800">Connection to Country</div>
                        <p className="text-xs text-purple-900 dark:text-purple-100 line-clamp-3">
                          {aiContent.aiContent.connectionToCountry}
                        </p>
                      </div>
                    )}
                    
                    {/* Traditional Foods */}
                    {aiContent.aiContent.traditionalFoods && aiContent.aiContent.traditionalFoods.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-purple-800">
                          <Utensils className="w-3 h-3" />
                          Traditional Foods
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {aiContent.aiContent.traditionalFoods.slice(0, 4).map((food, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] bg-purple-200/50 text-purple-900">
                              {food}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Art Styles */}
                    {aiContent.aiContent.artStyles && aiContent.aiContent.artStyles.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-purple-800">
                          <Palette className="w-3 h-3" />
                          Art & Expression
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {aiContent.aiContent.artStyles.slice(0, 3).map((style, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] bg-purple-200/50 text-purple-900">
                              {style}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : aiLoading ? (
                  <div className="text-xs text-purple-600 text-center py-2">
                    <Sparkles className="w-4 h-4 animate-spin inline mr-1" />
                    Researching cultural information...
                  </div>
                ) : (
                  <div className="text-xs text-purple-600 text-center py-2">
                    Click "View Detailed Information" for full cultural content
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Show a preview of businesses if available */}
          {businesses && (businesses as any[]).length > 0 && (
            <div className="space-y-2">
              <h5 className="font-semibold text-earth-brown text-sm">Local Businesses</h5>
              <div className="text-xs text-earth-dark/70">
                {(businesses as any[]).length} business{(businesses as any[]).length !== 1 ? 'es' : ''} found
              </div>
            </div>
          )}

          <Button 
            onClick={onShowModal}
            className="w-full bg-earth-brown hover:bg-earth-brown/90 text-white"
            data-testid="button-view-details"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            </svg>
            View Detailed Information
          </Button>
        </div>
      </div>
    </Card>
  );
}
