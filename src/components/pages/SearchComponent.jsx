import React, { useState } from 'react';
import { Download, SlidersHorizontal } from 'lucide-react';

const SearchComponent = ({
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

  // Filter props - Now with popup modal
  onFilterApply,
  filterPlaceholder = "Filter",
  showFilter = true,

  // Additional filter data for popup
  archiveOptions = [
    { value: 'all', label: 'All' },
    { value: 'archive', label: 'Archive' },
    { value: 'active', label: 'Active' },
  ],
  transactionTypeOptions = [
    { value: 'all', label: 'All activity' },
    { value: 'credit', label: 'Credit' },
    { value: 'debit', label: 'Debit' },
  ],
  currencyOptions = [
    { value: 'all', label: 'All' },
    { value: 'usd', label: 'USD' },
    { value: 'eur', label: 'EUR' },
    { value: 'gbp', label: 'GBP' },
  ],
  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'New', label: 'New' },
    { value: 'Duplicate', label: 'Duplicate' },
    { value: 'AI Failed', label: 'AI Failed' },
    { value: 'AI Passed', label: 'AI Passed' },
    { value: 'In process', label: 'In process' },
    { value: 'Accepted', label: 'Accepted' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Published', label: 'Published' },
    { value: 'Blacklisted', label: 'Blacklisted' },
    { value: 'Spam Score High', label: 'Spam Score High' },
    { value: 'Link Removed', label: 'Link Removed' },
    { value: 'Link ReAdded', label: 'Link ReAdded' },
    { value: 'Hold', label: 'Hold' },
  ],

  className = "",
}) => {
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    archive: 'all',
    transactionType: 'all',
    dateRange: '30',
    currency: 'all',
    status: 'all',
    minAmount: 0,
    maxAmount: 0,
  });

  const handleFilterClick = () => {
    setShowFilterPopup(!showFilterPopup);
  };

  const handleFilterApply = () => {
    if (onFilterApply) {
      onFilterApply(localFilters);
    }
    setShowFilterPopup(false);
  };

  const handleFilterReset = () => {
    setLocalFilters({
      archive: 'all',
      transactionType: 'all',
      dateRange: '30',
      currency: 'all',
      status: 'all',
      minAmount: 0,
      maxAmount: 0,
    });
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 p-4  ${className}`}>

      {/* Left side: Dropdown + Search */}
      <div className="flex flex-wrap items-center gap-4 flex-1">
        {/* Main Dropdown */}
        {dropdownOptions.length > 0 && (
          <div className="relative min-w-[150px]">
            <select
              className="block w-full px-4 py-4 pr-8 text-sm border border-gray-300 rounded-full  outline-none appearance-none bg-white"
              value={selectedDropdownValue || ""}
              onChange={(e) => onDropdownChange && onDropdownChange(e.target.value)}
            >
              <option value="" disabled>
                {dropdownPlaceholder}
              </option>
              {dropdownOptions.map((option, index) => (
                <option key={index} value={option.value}>
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

        {/* Search */}
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <input
            type="text"
            className="w-full px-4 py-4 pl-10 text-sm bg-white border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder={searchPlaceholder}
            value={searchValue || ""}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right side: Filter Button + Download/Export */}
      <div className="flex items-center gap-4 relative">
        {/* Filter Button with Popup */}
        {showFilter && (
          <>
            <button
              className="flex items-center gap-2 px-4 py-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              onClick={handleFilterClick}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{filterPlaceholder}</span>
            </button>

            {/* Filter Popup Modal */}
            {showFilterPopup && (
              <div className="absolute right-0 top-full mt-2 z-50 w-[500px] bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                    <button
                      onClick={() => setShowFilterPopup(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* First Row: Archive + Transaction Type */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Archive Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Archive</h4>
                      <select
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={localFilters.archive}
                        onChange={(e) => setLocalFilters({ ...localFilters, archive: e.target.value })}
                      >
                        {archiveOptions.map((option, index) => (
                          <option key={index} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Transaction Type Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Transaction type</h4>
                      <select
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={localFilters.transactionType}
                        onChange={(e) => setLocalFilters({ ...localFilters, transactionType: e.target.value })}
                      >
                        {transactionTypeOptions.map((option, index) => (
                          <option key={index} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Second Row: Date + Currency */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Date Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Date</h4>
                      <select
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={localFilters.dateRange}
                        onChange={(e) => setLocalFilters({ ...localFilters, dateRange: e.target.value })}
                      >
                        <option value="7">Past 7 days</option>
                        <option value="30">Past 30 days</option>
                        <option value="90">Past 90 days</option>
                        <option value="365">Past year</option>
                        <option value="custom">Custom range</option>
                      </select>
                    </div>

                    {/* Currency Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Currency</h4>
                      <select
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={localFilters.currency}
                        onChange={(e) => setLocalFilters({ ...localFilters, currency: e.target.value })}
                      >
                        {currencyOptions.map((option, index) => (
                          <option key={index} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Third Row: Status + Empty Space for alignment */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Status Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                      <select
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={localFilters?.status}
                        onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
                      >
                        {statusOptions.map((option, index) => (
                          <option key={index} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Empty div for maintaining grid structure */}
                    <div></div>
                  </div>

                  {/* Fourth Row: Amount Range (Full width) */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Amount range</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Minimum amount</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={localFilters.minAmount}
                          onChange={(e) => setLocalFilters({ ...localFilters, minAmount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Maximum amount</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={localFilters.maxAmount}
                          onChange={(e) => setLocalFilters({ ...localFilters, maxAmount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleFilterReset}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                    >
                      Reset
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
          </>
        )}

        {/* Download/Export Button */}
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

export default SearchComponent;