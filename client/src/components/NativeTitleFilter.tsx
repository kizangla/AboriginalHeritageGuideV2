import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';

interface NativeTitleFilterProps {
  onFilterChange: (filters: NativeTitleStatusFilter) => void;
  activeFilters: NativeTitleStatusFilter;
}

export interface NativeTitleStatusFilter {
  determined: boolean;
  pending: boolean;
  exists: boolean;
  doesNotExist: boolean;
  partialArea: boolean;
  entireArea: boolean;
  discontinued: boolean;
  dismissed: boolean;
}

export default function NativeTitleFilter({ onFilterChange, activeFilters }: NativeTitleFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filterOptions = [
    {
      category: 'Status',
      options: [
        { key: 'determined' as keyof NativeTitleStatusFilter, label: 'Determined', count: 648, description: 'Final court decisions' },
        { key: 'pending' as keyof NativeTitleStatusFilter, label: 'Pending Applications', count: 102, description: 'Active claims in progress' }
      ]
    },
    {
      category: 'Determination Outcomes',
      options: [
        { key: 'exists' as keyof NativeTitleStatusFilter, label: 'Native Title Exists', count: 425, description: 'Court recognized native title' },
        { key: 'doesNotExist' as keyof NativeTitleStatusFilter, label: 'Native Title Does Not Exist', count: 89, description: 'Court found no native title' },
        { key: 'partialArea' as keyof NativeTitleStatusFilter, label: 'Exists in Part', count: 134, description: 'Native title in some areas only' },
        { key: 'entireArea' as keyof NativeTitleStatusFilter, label: 'Exists in Entire Area', count: 291, description: 'Native title across full claim area' }
      ]
    },
    {
      category: 'Other Outcomes',
      options: [
        { key: 'discontinued' as keyof NativeTitleStatusFilter, label: 'Discontinued', count: 45, description: 'Claims withdrawn by applicants' },
        { key: 'dismissed' as keyof NativeTitleStatusFilter, label: 'Dismissed', count: 44, description: 'Claims dismissed by court' }
      ]
    }
  ];

  const handleFilterToggle = (key: keyof NativeTitleStatusFilter) => {
    const newFilters = {
      ...activeFilters,
      [key]: !activeFilters[key]
    };
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = Object.keys(activeFilters).reduce(
      (acc, key) => ({ ...acc, [key]: false }),
      {} as NativeTitleStatusFilter
    );
    onFilterChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(activeFilters).filter(Boolean).length;
  };

  const hasActiveFilters = getActiveFilterCount() > 0;

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="flex items-center justify-between text-sm sm:text-base">
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Native Title Status</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </div>
              {isOpen ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 px-3 pb-3 sm:px-4 sm:pb-4">
            {hasActiveFilters && (
              <div className="flex items-center justify-between mb-3 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                  {getActiveFilterCount()} filter(s) applied
                </span>
                <Button 
                  onClick={clearAllFilters}
                  variant="ghost" 
                  size="sm"
                  className="h-auto p-1 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <X className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Clear all</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              </div>
            )}

            <div className="space-y-4 sm:space-y-6">
              {filterOptions.map((category) => (
                <div key={category.category} className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 border-b pb-1">
                    {category.category}
                  </h4>
                  <div className="space-y-2 sm:space-y-3">
                    {category.options.map((option) => (
                      <div key={option.key} className="flex items-start space-x-2 sm:space-x-3">
                        <Checkbox
                          id={option.key}
                          checked={activeFilters[option.key]}
                          onCheckedChange={() => handleFilterToggle(option.key)}
                          className="mt-0.5 h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={option.key}
                            className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer block leading-tight"
                          >
                            {option.label}
                          </label>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                              {option.description}
                            </span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5 w-fit">
                              {option.count.toLocaleString()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Data from National Native Title Tribunal (NNTT) - 
                Applications and final court determinations from Australian Government sources
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}