/**
 * Stacked Report Cards - Displays multiple overlapping exploration reports as swipeable cards
 */

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, FileText, Calendar, Building2 } from 'lucide-react';

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

const getCommodityEmoji = (commodity: string): string => {
  const lower = commodity.toLowerCase();
  if (lower.includes('gold')) return '🥇';
  if (lower.includes('iron')) return '⛏️';
  if (lower.includes('lithium')) return '🔋';
  if (lower.includes('copper')) return '🔶';
  if (lower.includes('nickel')) return '⚪';
  if (lower.includes('rare earth')) return '💫';
  if (lower.includes('diamond')) return '💎';
  if (lower.includes('uranium')) return '☢️';
  if (lower.includes('zinc')) return '🔩';
  if (lower.includes('coal')) return '⬛';
  return '📋';
};

export default function StackedReportCards({ reports, onClose, position }: StackedReportCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (reports.length === 0) return null;

  const currentReport = reports[currentIndex];
  const primaryCommodity = currentReport.targetCommodity?.split(';')[0]?.trim() || 'Unknown';
  const commodityColor = getCommodityColor(primaryCommodity);
  const commodityEmoji = getCommodityEmoji(primaryCommodity);

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
        left: Math.min(position.x, window.innerWidth - 360),
        top: Math.min(position.y, window.innerHeight - 320)
      }}
      data-testid="stacked-report-cards"
    >
      {/* Background cards for stack effect */}
      {reports.length > 1 && (
        <>
          <div 
            className="absolute bg-white rounded-2xl shadow-lg"
            style={{ 
              width: 340,
              height: 220,
              transform: 'rotate(2deg) translateY(6px) translateX(4px)',
              opacity: 0.7
            }}
          />
          {reports.length > 2 && (
            <div 
              className="absolute bg-white rounded-2xl shadow-md"
              style={{ 
                width: 340,
                height: 220,
                transform: 'rotate(-1.5deg) translateY(12px) translateX(-2px)',
                opacity: 0.5
              }}
            />
          )}
        </>
      )}

      {/* Main card */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: 340 }}
      >
        {/* Header */}
        <div 
          className="relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${commodityColor}, ${commodityColor}dd)`,
          }}
        >
          {/* Decorative pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                               radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
                               radial-gradient(circle at 40% 80%, white 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
          
          <div className="relative px-5 py-4">
            {/* Top row with emoji badge and close button */}
            <div className="flex items-start justify-between mb-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
              >
                {commodityEmoji}
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                data-testid="button-close-stacked-cards"
              >
                <X className="w-5 h-5 text-white/90" />
              </button>
            </div>
            
            {/* Project title */}
            <h3 className="font-bold text-white text-lg leading-tight mb-1 drop-shadow-sm">
              {currentReport.project || 'Exploration Report'}
            </h3>
            
            {/* Report info badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                <FileText className="w-3 h-3" />
                {currentReport.aNumber || currentReport.id}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                <Calendar className="w-3 h-3" />
                {currentReport.reportYear || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Operator</span>
              <p className="text-gray-900 font-medium text-sm truncate">
                {currentReport.operator || 'Unknown'}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${commodityColor}20` }}
            >
              <span 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: commodityColor }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Target Commodity</span>
              <p className="text-gray-900 font-medium text-sm">
                {currentReport.targetCommodity || 'Unknown'}
              </p>
            </div>
          </div>

          {currentReport.abstractUrl && (
            <a 
              href={currentReport.abstractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium mt-1 group"
            >
              View Full Report 
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          )}
        </div>

        {/* Footer with navigation */}
        <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-500">
              WA Dept of Mines
            </span>
          </div>
          
          {reports.length > 1 && (
            <div className="flex items-center gap-0.5 bg-white rounded-full shadow-sm border border-gray-200 p-0.5">
              <button
                onClick={goPrev}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="button-prev-card"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-xs text-gray-700 font-semibold px-2 min-w-[40px] text-center">
                {currentIndex + 1} / {reports.length}
              </span>
              <button
                onClick={goNext}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
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
