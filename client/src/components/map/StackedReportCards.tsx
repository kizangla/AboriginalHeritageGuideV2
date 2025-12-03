/**
 * Stacked Report Cards - Displays multiple overlapping exploration reports as swipeable cards
 */

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface ExplorationReport {
  id: string;
  targetCommodity: string;
  operator: string;
  project: string;
  reportYear: number;
  keywords?: string;
  aNumber?: string;
  abstractUrl?: string;
}

interface StackedReportCardsProps {
  reports: ExplorationReport[];
  onClose: () => void;
  position: { x: number; y: number };
}

const getCommodityColor = (commodity: string): string => {
  const lower = commodity.toLowerCase();
  if (lower.includes('gold')) return '#FFD700';
  if (lower.includes('iron')) return '#B22222';
  if (lower.includes('lithium')) return '#9370DB';
  if (lower.includes('copper')) return '#B87333';
  if (lower.includes('nickel')) return '#71797E';
  if (lower.includes('rare earth')) return '#FF69B4';
  if (lower.includes('diamond')) return '#B9F2FF';
  if (lower.includes('uranium')) return '#32CD32';
  if (lower.includes('zinc')) return '#708090';
  if (lower.includes('coal')) return '#36454F';
  return '#6366F1';
};

export default function StackedReportCards({ reports, onClose, position }: StackedReportCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (reports.length === 0) return null;

  const currentReport = reports[currentIndex];
  const primaryCommodity = currentReport.targetCommodity?.split(';')[0]?.trim() || 'Unknown';
  const commodityColor = getCommodityColor(primaryCommodity);

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % reports.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + reports.length) % reports.length);
  };

  return (
    <div 
      className="fixed z-[2000] pointer-events-auto"
      style={{ 
        left: Math.min(position.x, window.innerWidth - 340),
        top: Math.min(position.y, window.innerHeight - 300)
      }}
      data-testid="stacked-report-cards"
    >
      {/* Background cards for stack effect */}
      {reports.length > 1 && (
        <>
          <div 
            className="absolute bg-white rounded-xl shadow-md border border-gray-200"
            style={{ 
              width: 320,
              height: 200,
              transform: 'rotate(3deg) translateY(8px)',
              opacity: 0.6
            }}
          />
          {reports.length > 2 && (
            <div 
              className="absolute bg-white rounded-xl shadow-sm border border-gray-200"
              style={{ 
                width: 320,
                height: 200,
                transform: 'rotate(-2deg) translateY(16px)',
                opacity: 0.4
              }}
            />
          )}
        </>
      )}

      {/* Main card */}
      <div 
        className="relative bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
        style={{ width: 320 }}
      >
        {/* Header with commodity color */}
        <div 
          className="px-4 py-3 flex items-start justify-between"
          style={{ background: `linear-gradient(135deg, ${commodityColor}22, ${commodityColor}44)` }}
        >
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base truncate">
              {currentReport.project || 'Exploration Report'}
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Report {currentReport.aNumber || currentReport.id} • {currentReport.reportYear || 'Unknown'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-black/10 rounded-full transition-colors ml-2 flex-shrink-0"
            data-testid="button-close-stacked-cards"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-2.5">
          <div className="flex items-start gap-2">
            <span className="text-gray-500 text-sm w-20 flex-shrink-0">Operator:</span>
            <span className="text-gray-900 text-sm font-medium">{currentReport.operator || 'Unknown'}</span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-gray-500 text-sm w-20 flex-shrink-0">Commodity:</span>
            <span className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: commodityColor }}
              />
              <span className="text-gray-900 text-sm font-medium">
                {currentReport.targetCommodity || 'Unknown'}
              </span>
            </span>
          </div>

          {currentReport.abstractUrl && (
            <a 
              href={currentReport.abstractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm mt-1"
            >
              View Full Report <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Footer with navigation */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Source: WA Dept of Mines (DMIRS)
          </span>
          
          {reports.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                data-testid="button-prev-card"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-xs text-gray-600 font-medium px-1">
                {currentIndex + 1} / {reports.length}
              </span>
              <button
                onClick={goNext}
                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                data-testid="button-next-card"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
