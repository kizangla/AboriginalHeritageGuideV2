/**
 * Advanced Layer Controls for Multiple Indigenous Data Sources
 * Enables toggling between RATSIB, ABS Indigenous Regions, and AIATSIS Language Boundaries
 */

interface AdvancedLayerControlsProps {
  showRATSIBBoundaries: boolean;
  showABSRegions: boolean;
  showAIATSISLanguages: boolean;
  onRATSIBToggle: (show: boolean) => void;
  onABSRegionsToggle: (show: boolean) => void;
  onAIATSISLanguagesToggle: (show: boolean) => void;
}

export function AdvancedLayerControls({
  showRATSIBBoundaries,
  showABSRegions,
  showAIATSISLanguages,
  onRATSIBToggle,
  onABSRegionsToggle,
  onAIATSISLanguagesToggle
}: AdvancedLayerControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 min-w-[280px]">
      <h3 className="font-semibold text-sm text-gray-800 mb-3 border-b border-gray-200 pb-2">
        Indigenous Data Layers
      </h3>
      
      <div className="space-y-3">
        {/* RATSIB Boundaries Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700">
              RATSIB Boundaries
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              Registered Aboriginal & Torres Strait Islander Bodies
            </p>
          </div>
          <button
            onClick={() => onRATSIBToggle(!showRATSIBBoundaries)}
            className={`ml-3 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              showRATSIBBoundaries
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-150'
            }`}
          >
            {showRATSIBBoundaries ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* ABS Indigenous Regions Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700">
              ABS Indigenous Regions
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              Australian Bureau of Statistics geographical classification
            </p>
          </div>
          <button
            onClick={() => onABSRegionsToggle(!showABSRegions)}
            className={`ml-3 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              showABSRegions
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-150'
            }`}
          >
            {showABSRegions ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* AIATSIS Language Boundaries Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700">
              Language Boundaries
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              AIATSIS traditional Indigenous language groups
            </p>
          </div>
          <button
            onClick={() => onAIATSISLanguagesToggle(!showAIATSISLanguages)}
            className={`ml-3 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              showAIATSISLanguages
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-150'
            }`}
          >
            {showAIATSISLanguages ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Data Source Information */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <strong>Authentic Government Sources:</strong><br/>
          Australian Government • ABS • AIATSIS
        </p>
      </div>
    </div>
  );
}