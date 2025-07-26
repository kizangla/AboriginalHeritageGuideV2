import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface MapLoadingIndicatorProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export default function MapLoadingIndicator({ 
  isLoading, 
  progress, 
  message = 'Loading map data...' 
}: MapLoadingIndicatorProps) {
  if (!isLoading) return null;

  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] glass-effect rounded-xl p-4 modern-shadow-lg animate-fade-in-up">
      <div className="flex items-center gap-3 min-w-[250px]">
        <Loader2 className="w-5 h-5 animate-spin text-earth-orange" />
        <div className="flex-1">
          <p className="text-sm font-medium text-earth-brown">{message}</p>
          {progress !== undefined && (
            <div className="mt-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-gray-600 mt-1">{Math.round(progress)}% complete</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}