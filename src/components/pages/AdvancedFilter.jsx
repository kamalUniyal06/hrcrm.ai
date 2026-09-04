import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

const AdvancedFilter = ({
  // Configuration props
  filterConfig = [],
  onFilterApply,
  filterPlaceholder = "Advanced Filters",
  showFilter = true,
  
  // Initial values
  initialFilters = {},
  
  // Styling
  buttonClassName = "flex items-center gap-2 px-4 py-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200",
  
  // Additional props
  className = "",
  position = "right",
}) => {
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [localFilters, setLocalFilters] = useState({});
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    const initialFilterState = {};
    filterConfig.forEach(config => {
      if (config.type === 'select' || config.type === 'multi-select') {
        initialFilterState[config.key] = initialFilters[config.key] || config.defaultValue || (config.multiple ? [] : '');
      } else if (config.type === 'date' || config.type === 'date-range') {
        initialFilterState[config.key] = initialFilters[config.key] || (config.type === 'date-range' ? { start: '', end: '' } : '');
      } else if (config.type === 'number' || config.type === 'range') {
        if (config.type === 'range') {
          initialFilterState[config.key] = initialFilters[config.key] || { min: config.min || 0, max: config.max || 0 };
        } else {
          initialFilterState[config.key] = initialFilters[config.key] || config.defaultValue || 0;
        }
      } else if (config.type === 'checkbox' || config.type === 'radio') {
        initialFilterState[config.key] = initialFilters[config.key] || (config.type === 'checkbox' ? false : '');
      } else {
        initialFilterState[config.key] = initialFilters[config.key] || '';
      }
    });
    setLocalFilters(initialFilterState);
  }, [filterConfig, initialFilters]);

  useEffect(() => {
    let count = 0;
    Object.entries(localFilters).forEach(([key, value]) => {
      const config = filterConfig.find(c => c.key === key);
      if (config) {
        if (config.type === 'select' || config.type === 'multi-select') {
          if (config.multiple) {
            if (Array.isArray(value) && value.length > 0) {
              count++;
            }
          } else if (value && value !== config.defaultValue && value !== '' && value !== 'all') {
            count++;
          }
        } else if (config.type === 'number' || config.type === 'range') {
          if (config.type === 'range') {
            if ((value.min && value.min > 0) || (value.max && value.max > 0)) {
              count++;
            }
          } else if (value && value !== 0 && value !== config.defaultValue) {
            count++;
          }
        } else if (config.type === 'checkbox') {
          if (value) {
            count++;
          }
        } else if (config.type === 'radio') {
          if (value && value !== '') {
            count++;
          }
        } else if (config.type === 'date' || config.type === 'date-range') {
          if (config.type === 'date-range') {
            if (value.start || value.end) {
              count++;
            }
          } else if (value) {
            count++;
          }
        }
      }
    });
    setActiveFilterCount(count);
  }, [localFilters, filterConfig]);

  const handleFilterClick = () => {
    setShowFilterPopup(!showFilterPopup);
  };

  const handleFilterApply = () => {
    if (onFilterApply) {
      const cleanedFilters = {};
      Object.entries(localFilters).forEach(([key, value]) => {
        const config = filterConfig.find(c => c.key === key);
        if (config) {
          if (config.type === 'select' && (value === '' || value === 'all' || value === config.defaultValue)) {
            return;
          }
          if (config.type === 'range' && (!value.min && !value.max)) {
            return;
          }
          if (config.type === 'date-range' && (!value.start && !value.end)) {
            return;
          }
          if (config.type === 'checkbox' && !value) {
            return;
          }
          cleanedFilters[key] = value;
        }
      });
      onFilterApply(cleanedFilters);
    }
    setShowFilterPopup(false);
  };

  const handleFilterReset = () => {
    const resetFilters = {};
    filterConfig.forEach(config => {
      if (config.type === 'select' || config.type === 'multi-select') {
        resetFilters[config.key] = config.defaultValue || (config.multiple ? [] : '');
      } else if (config.type === 'date-range') {
        resetFilters[config.key] = { start: '', end: '' };
      } else if (config.type === 'range') {
        resetFilters[config.key] = { min: config.min || 0, max: config.max || 0 };
      } else if (config.type === 'checkbox') {
        resetFilters[config.key] = false;
      } else {
        resetFilters[config.key] = config.defaultValue || '';
      }
    });
    setLocalFilters(resetFilters);
    if (onFilterApply) {
      onFilterApply({});
    }
  };

  const handleFilterChange = (key, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderFilterField = (config) => {
    const { type, key, label, options, placeholder, min, max, step, multiple } = config;
    const value = localFilters[key] || '';

    switch (type) {
      case 'select':
        return (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{label}</h4>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={value}
              onChange={(e) => handleFilterChange(key, e.target.value)}
              multiple={multiple}
            >
              {options && options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={key}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={!!value}
              onChange={(e) => handleFilterChange(key, e.target.checked)}
            />
            <label htmlFor={key} className="ml-2 text-sm text-gray-700">
              {label}
            </label>
          </div>
        );

      case 'number':
        return (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{label}</h4>
            <input
              type="number"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={value}
              onChange={(e) => handleFilterChange(key, parseFloat(e.target.value) || 0)}
              min={min}
              max={max}
              step={step}
              placeholder={placeholder}
            />
          </div>
        );

      case 'range':
        return (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{label}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Minimum</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={value.min || ''}
                  onChange={(e) => handleFilterChange(key, {
                    ...value,
                    min: parseFloat(e.target.value) || 0
                  })}
                  min={min}
                  step={step}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Maximum</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={value.max || ''}
                  onChange={(e) => handleFilterChange(key, {
                    ...value,
                    max: parseFloat(e.target.value) || 0
                  })}
                  max={max}
                  step={step}
                />
              </div>
            </div>
          </div>
        );

      case 'date':
        return (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{label}</h4>
            <input
              type="date"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={value}
              onChange={(e) => handleFilterChange(key, e.target.value)}
            />
          </div>
        );

      case 'date-range':
        return (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{label}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={value.start || ''}
                  onChange={(e) => handleFilterChange(key, {
                    ...value,
                    start: e.target.value
                  })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={value.end || ''}
                  onChange={(e) => handleFilterChange(key, {
                    ...value,
                    end: e.target.value
                  })}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!showFilter || filterConfig.length === 0) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        className={buttonClassName}
        onClick={handleFilterClick}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span>{filterPlaceholder}</span>
        {activeFilterCount > 0 && (
          <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {showFilterPopup && (
        <div className={`absolute ${position === 'right' ? 'right-0' : 'left-0'} top-full mt-2 z-50 w-[500px] bg-white border border-gray-200 rounded-lg shadow-lg`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
              <button
                onClick={() => setShowFilterPopup(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 mb-6">
              {(() => {
                const columns = [[], []];
                filterConfig.forEach((config, index) => {
                  const columnIndex = index % 2;
                  columns[columnIndex].push(config);
                });

                return (
                  <div className="grid grid-cols-2 gap-6">
                    {columns.map((column, columnIndex) => (
                      <div key={columnIndex} className="space-y-6">
                        {column.map((config) => (
                          <div key={config.key}>
                            {renderFilterField(config)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleFilterReset}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
              >
                Reset All
              </button>
              <button
                onClick={handleFilterApply}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilter;