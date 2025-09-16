import { useState, useEffect } from 'react';
import { MapStateManager, type MapState } from '@/lib/map-state-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { 
  Share2, 
  Save, 
  Link, 
  Copy, 
  Bookmark,
  Clock,
  Trash2,
  Download,
  Upload,
  MapIcon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type L from 'leaflet';

interface SaveShareMapViewProps {
  map: L.Map | null;
  layers: {
    territories: boolean;
    nativeTitle: boolean;
    ratsib: boolean;
    mining: boolean;
    exploration: boolean;
    businesses: boolean;
  };
  filters: {
    region: string | null;
    nativeTitle: any;
    mining: any;
  };
  selectedTerritory: string | null;
  onLoadView?: (state: MapState) => void;
}

export function SaveShareMapView({ 
  map, 
  layers, 
  filters, 
  selectedTerritory,
  onLoadView 
}: SaveShareMapViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [viewDescription, setViewDescription] = useState('');
  const [savedViews, setSavedViews] = useState<Array<MapState & { id: string }>>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const { toast } = useToast();

  // Load saved views on mount
  useEffect(() => {
    setSavedViews(MapStateManager.getSavedViews());
  }, []);

  // Check if there's a view in the URL on mount
  useEffect(() => {
    const urlState = MapStateManager.loadFromUrl();
    if (urlState && onLoadView) {
      onLoadView(urlState);
      toast({
        title: "Map View Loaded",
        description: "The shared map view has been loaded successfully.",
      });
    }
  }, []);

  const getCurrentMapState = (): MapState | null => {
    if (!map) return null;

    const center = map.getCenter();
    const zoom = map.getZoom();

    return {
      center: {
        lat: center.lat,
        lng: center.lng
      },
      zoom,
      layers,
      filters,
      selectedTerritory,
      name: viewName || undefined,
      description: viewDescription || undefined
    };
  };

  const handleSaveView = () => {
    const state = getCurrentMapState();
    if (!state) {
      toast({
        title: "Error",
        description: "Unable to save map state. Map not initialized.",
        variant: "destructive"
      });
      return;
    }

    const encoded = MapStateManager.saveState(state);
    setSavedViews(MapStateManager.getSavedViews());
    
    toast({
      title: "View Saved",
      description: viewName || "Your map view has been saved locally.",
    });

    setViewName('');
    setViewDescription('');
    setIsOpen(false);
  };

  const handleShareView = async () => {
    const state = getCurrentMapState();
    if (!state) {
      toast({
        title: "Error",
        description: "Unable to share map state. Map not initialized.",
        variant: "destructive"
      });
      return;
    }

    const url = MapStateManager.saveToUrl(state);
    setShareUrl(url);

    // Copy to clipboard
    await navigator.clipboard.writeText(url);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);

    toast({
      title: "Link Copied",
      description: "Share link has been copied to your clipboard.",
    });
  };

  const handleLoadView = (view: MapState) => {
    if (onLoadView) {
      onLoadView(view);
      toast({
        title: "View Loaded",
        description: view.name || "Map view has been loaded.",
      });
    }
  };

  const handleDeleteView = (id: string) => {
    MapStateManager.deleteSavedView(id);
    setSavedViews(MapStateManager.getSavedViews());
    toast({
      title: "View Deleted",
      description: "Saved view has been deleted.",
    });
  };

  const handleExportViews = () => {
    const views = MapStateManager.getSavedViews();
    const dataStr = JSON.stringify(views, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `map-views-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Views Exported",
      description: `${views.length} views exported to ${exportFileDefaultName}`,
    });
  };

  const handleImportViews = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const views = JSON.parse(e.target?.result as string);
        // Validate and save each view
        views.forEach((view: any) => {
          MapStateManager.saveState(view);
        });
        setSavedViews(MapStateManager.getSavedViews());
        toast({
          title: "Views Imported",
          description: `${views.length} views imported successfully.`,
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to import views. Invalid file format.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      {/* Save/Share Button Group */}
      <div className="absolute top-4 right-20 z-[998] flex gap-2" data-testid="save-share-controls">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="shadow-lg">
              <Save className="h-4 w-4 mr-2" />
              Save View
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Save Map View</DialogTitle>
              <DialogDescription>
                Save your current map configuration including position, zoom, active layers, and filters.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="e.g., Mining in Western Australia"
                  data-testid="view-name-input"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={viewDescription}
                  onChange={(e) => setViewDescription(e.target.value)}
                  placeholder="Add notes about this view..."
                  rows={3}
                  data-testid="view-description-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleSaveView} data-testid="save-view-button">
                <Save className="h-4 w-4 mr-2" />
                Save View
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleShareView}
          className="shadow-lg"
          data-testid="share-button"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
          {showCopied && (
            <Badge variant="secondary" className="ml-2">
              Copied!
            </Badge>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shadow-lg" data-testid="saved-views-menu">
              <Bookmark className="h-4 w-4 mr-2" />
              Saved Views ({savedViews.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            <DropdownMenuLabel>Saved Map Views</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {savedViews.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No saved views yet
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {savedViews.map((view) => (
                  <div 
                    key={view.id} 
                    className="p-2 hover:bg-accent rounded-md cursor-pointer"
                    data-testid={`saved-view-${view.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => handleLoadView(view)}
                      >
                        <div className="flex items-center gap-2">
                          <MapIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {view.name || 'Unnamed View'}
                          </span>
                        </div>
                        {view.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {view.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs text-muted-foreground">
                            {view.timestamp && formatDistanceToNow(new Date(view.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteView(view.id);
                        }}
                        data-testid={`delete-view-${view.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportViews} data-testid="export-views">
              <Download className="h-4 w-4 mr-2" />
              Export All Views
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <label htmlFor="import-views" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Import Views
                <input
                  id="import-views"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportViews}
                  data-testid="import-views-input"
                />
              </label>
            </DropdownMenuItem>
            {savedViews.length > 0 && (
              <DropdownMenuItem 
                onClick={() => {
                  MapStateManager.clearSavedViews();
                  setSavedViews([]);
                  toast({
                    title: "Views Cleared",
                    description: "All saved views have been removed.",
                  });
                }}
                className="text-destructive"
                data-testid="clear-all-views"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Views
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Share URL Display (when generated) */}
      {shareUrl && (
        <Card className="absolute bottom-20 right-4 z-[998] w-96 shadow-xl" data-testid="share-url-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Share This View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
                data-testid="share-url-input"
              />
              <Button
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  toast({
                    title: "Copied",
                    description: "Link copied to clipboard",
                  });
                }}
                data-testid="copy-url-button"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Anyone with this link can load your exact map view
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}