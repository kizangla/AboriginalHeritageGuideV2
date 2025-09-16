import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Database,
  Map,
  Building,
  Layers
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { queryClient } from '@/lib/queryClient';

interface DataSource {
  id: string;
  name: string;
  icon: React.ReactNode;
  lastUpdated: string | null;
  status: 'fresh' | 'stale' | 'updating' | 'error';
  recordCount?: number;
  source?: string;
  nextUpdate?: string;
}

interface DataFreshnessIndicatorProps {
  isOpen?: boolean;
  onRefresh?: (sourceId: string) => void;
}

export function DataFreshnessIndicator({ isOpen = true, onRefresh }: DataFreshnessIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [dataSources, setDataSources] = useState<DataSource[]>([
    {
      id: 'territories',
      name: 'Aboriginal Territories',
      icon: <Map className="h-4 w-4" />,
      lastUpdated: new Date().toISOString(),
      status: 'fresh',
      recordCount: 626,
      source: 'Static GeoJSON'
    },
    {
      id: 'mining',
      name: 'Mining Tenements',
      icon: <Layers className="h-4 w-4" />,
      lastUpdated: null,
      status: 'fresh',
      recordCount: 0,
      source: 'WA DMIRS'
    },
    {
      id: 'native-title',
      name: 'Native Title Claims',
      icon: <Database className="h-4 w-4" />,
      lastUpdated: null,
      status: 'fresh',
      recordCount: 0,
      source: 'Native Title Tribunal'
    },
    {
      id: 'ratsib',
      name: 'RATSIB Boundaries',
      icon: <Map className="h-4 w-4" />,
      lastUpdated: null,
      status: 'fresh',
      recordCount: 0,
      source: 'Australian Government'
    },
    {
      id: 'businesses',
      name: 'Indigenous Businesses',
      icon: <Building className="h-4 w-4" />,
      lastUpdated: null,
      status: 'fresh',
      recordCount: 0,
      source: 'ABR & Supply Nation'
    }
  ]);

  // Fetch data freshness information from the API
  const { data: freshnessData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/data-freshness'],
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000 // Consider data stale after 30 seconds
  });

  // Update data sources with fetched data
  useEffect(() => {
    if (freshnessData) {
      setDataSources(prev => prev.map(source => {
        const data = (freshnessData as any)[source.id];
        if (data) {
          return {
            ...source,
            lastUpdated: data.lastUpdated,
            recordCount: data.recordCount,
            status: data.status
          };
        }
        return source;
      }));
    }
  }, [freshnessData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fresh':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'stale':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'updating':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      fresh: 'default',
      stale: 'secondary',
      updating: 'outline',
      error: 'destructive'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status}
      </Badge>
    );
  };

  const formatLastUpdated = (date: string | null) => {
    if (!date) return 'Never';
    
    const dateObj = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } else if (diffInHours < 24) {
      return format(dateObj, 'h:mm a');
    } else if (diffInHours < 168) { // Less than a week
      return format(dateObj, 'EEEE h:mm a');
    } else {
      return format(dateObj, 'MMM d, yyyy');
    }
  };

  const handleRefresh = async (sourceId: string) => {
    // Update status to updating
    setDataSources(prev => prev.map(source => 
      source.id === sourceId ? { ...source, status: 'updating' } : source
    ));

    // Call the refresh callback if provided
    if (onRefresh) {
      onRefresh(sourceId);
    }

    // Invalidate relevant queries to trigger data refresh
    // Use partial matching to invalidate all related queries
    switch (sourceId) {
      case 'territories':
        await queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0] as string;
            return Boolean(key && key.includes('/api/territories'));
          }
        });
        break;
      case 'mining':
        // Invalidate all mining-related queries
        await queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0] as string;
            return Boolean(key && key.includes('/api/mining'));
          }
        });
        break;
      case 'native-title':
        // Invalidate native title queries
        await queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0] as string;
            return Boolean(key && key.includes('native-title'));
          }
        });
        break;
      case 'ratsib':
        // Invalidate RATSIB queries - specifically the all-boundaries endpoint
        await queryClient.invalidateQueries({ queryKey: ['/api/ratsib/all-boundaries'] });
        await queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0] as string;
            return Boolean(key && key.includes('/ratsib'));
          }
        });
        break;
      case 'businesses':
        // Invalidate all business-related queries
        await queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0] as string;
            return Boolean(key && (key.includes('/api/businesses') || 
                          key.includes('/api/indigenous-businesses') ||
                          key.includes('abr-business')));
          }
        });
        break;
    }
    
    // Always refresh the freshness data itself
    await queryClient.invalidateQueries({ queryKey: ['/api/data-freshness'] });
    await refetch();
  };

  if (!isOpen) return null;

  // Show loading state
  if (isLoading) {
    return (
      <Card className="absolute bottom-4 right-4 z-[998] w-80 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <CardTitle className="text-sm font-medium">Loading data freshness...</CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="absolute bottom-4 right-4 z-[998] w-80 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-sm font-medium">Failed to load data freshness</CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="absolute bottom-4 right-4 z-[998] w-80 shadow-xl" data-testid="data-freshness-indicator">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Data Freshness</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {dataSources.filter(s => s.status === 'fresh').length}/{dataSources.length} fresh
              </Badge>
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {dataSources.map(source => (
                <div 
                  key={source.id} 
                  className="flex items-start justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  data-testid={`data-source-${source.id}`}
                >
                  <div className="flex items-start gap-2 flex-1">
                    <div className="mt-0.5">{source.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{source.name}</span>
                        {getStatusBadge(source.status)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {source.lastUpdated ? (
                          <>Updated {formatLastUpdated(source.lastUpdated)}</>
                        ) : (
                          <>No data</>
                        )}
                      </div>
                      {source.recordCount !== undefined && source.recordCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {source.recordCount.toLocaleString()} records
                        </div>
                      )}
                      {source.source && (
                        <div className="text-xs text-muted-foreground">
                          Source: {source.source}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-1">
                    {getStatusIcon(source.status)}
                    {source.status !== 'updating' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRefresh(source.id)}
                        data-testid={`refresh-${source.id}`}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  dataSources.forEach(source => handleRefresh(source.id));
                }}
                data-testid="refresh-all-button"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All Data
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}