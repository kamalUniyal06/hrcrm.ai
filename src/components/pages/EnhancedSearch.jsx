import React, { useState } from 'react';
import { Download, Search } from 'lucide-react';
import AdvancedFilter from './AdvancedFilter';

const EnhancedSearch = ({
  // Dropdown props (Main filter)
  dropdownOptions = [],
  onDropdownChange,
  selectedDropdownValue,
  dropdownPlaceholder = "Select",

  // Search props
  onSearchChange,
  searchValue,
  searchPlaceholder = "Search",

  // Download props
  onDownloadClick,
  showDownload = true,

  // Advanced Filter props
  filterConfig = [],
  onFilterApply,
  showFilter = true,
  filterPlaceholder = "Advanced Filters",

  // Additional props
  className = "",
}) => {
  const [filterValues, setFilterValues] = useState({});

  const handleFilterApply = (filters) => {
    setFilterValues(filters);
    if (onFilterApply) {
      onFilterApply(filters);
    }
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 p-4 ${className}`}>
      <div className="flex flex-wrap items-center gap-4 flex-1">
        {dropdownOptions.length > 0 && (
          <div className="relative min-w-[150px]">
            <select
              className="block w-full px-4 py-4 pr-8 text-sm border border-gray-300 rounded-full outline-none appearance-none bg-white"
              value={selectedDropdownValue || ""}
              onChange={(e) => onDropdownChange && onDropdownChange(e.target.value)}
            >
              <option value="" disabled>
                {dropdownPlaceholder}
              </option>
              {dropdownOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        <div className="relative flex-1 min-w-[250px] max-w-md">
          <input
            type="text"
            className="w-full px-4 py-4 pl-10 text-sm bg-white border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder={searchPlaceholder}
            value={searchValue || ""}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <AdvancedFilter
          filterConfig={filterConfig}
          onFilterApply={handleFilterApply}
          filterPlaceholder={filterPlaceholder}
          showFilter={showFilter}
          initialFilters={filterValues}
          position="right"
        />

        {showDownload && (
          <button
            className="px-4 py-4 text-sm font-medium text-black bg-white rounded-full hover:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            onClick={onDownloadClick}
          >
            <div className="flex items-center gap-2">
              <Download />
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default EnhancedSearch;