"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  group?: string;
}

interface SearchableSelectProps {
  label: string;
  icon?: React.ReactNode;
  countBadge?: React.ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  allowCustomInput?: boolean;
  customInputPlaceholder?: string;
  showSubLabelInTrigger?: boolean;
  className?: string;
}

export function SearchableSelect({
  label,
  icon,
  countBadge,
  placeholder = "Select an option...",
  searchPlaceholder = "Type to search...",
  value,
  onChange,
  options,
  disabled = false,
  allowCustomInput = false,
  customInputPlaceholder = "Type custom area...",
  showSubLabelInTrigger = false,
  className = "",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Selected option display
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
      const matchGroup = opt.group ? opt.group.toLowerCase().includes(q) : false;
      return matchLabel || matchSub || matchGroup;
    });
  }, [options, searchQuery]);

  // Grouped options if groups exist
  const groupedOptions = useMemo(() => {
    const hasGroups = filteredOptions.some((opt) => Boolean(opt.group));
    if (!hasGroups) return null;

    const groups: Record<string, SelectOption[]> = {};
    for (const opt of filteredOptions) {
      const g = opt.group || "Other";
      if (!groups[g]) groups[g] = [];
      groups[g].push(opt);
    }
    return groups;
  }, [filteredOptions]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleCustomSubmit = () => {
    if (searchQuery.trim()) {
      onChange(searchQuery.trim());
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const displayTitle = selectedOption
    ? selectedOption.label
    : value
    ? value
    : placeholder;

  return (
    <div className={`relative space-y-1.5 ${className}`} ref={containerRef}>
      {/* Label Header with Optional Count Badge (strictly 1 line, no wrapping) */}
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 select-none truncate">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{label}</span>
        </label>
        {countBadge && (
          <div className="shrink-0 whitespace-nowrap">
            {countBadge}
          </div>
        )}
      </div>

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-11 px-3.5 rounded-xl border text-left flex items-center justify-between text-sm transition-all shadow-xs ${
          disabled
            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            : isOpen
            ? "bg-white border-blue-600 ring-2 ring-blue-500/20 text-slate-900"
            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-800"
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-1.5 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 flex items-center justify-center">{selectedOption.icon}</span>
          )}
          <span className={`truncate font-medium text-xs sm:text-sm ${!value ? "text-slate-400 font-normal" : "text-slate-900"}`}>
            {displayTitle}
          </span>
          {showSubLabelInTrigger && selectedOption?.subLabel && (
            <span className="text-xs text-slate-500 shrink-0 hidden sm:inline">
              ({selectedOption.subLabel})
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-80 sm:max-h-96">
          {/* Top Search Input Box */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filteredOptions.length > 0) {
                      handleSelect(filteredOptions[0].value);
                    } else if (allowCustomInput && searchQuery.trim()) {
                      handleCustomSubmit();
                    }
                  } else if (e.key === "Escape") {
                    setIsOpen(false);
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-9 pr-8 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 p-1 divide-y divide-slate-50">
            {allowCustomInput && searchQuery.trim() && (
              <div className="p-1">
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-between"
                >
                  <span>
                    Use custom area: <strong className="underline">"{searchQuery.trim()}"</strong>
                  </span>
                  <Check className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            )}

            {filteredOptions.length === 0 && !allowCustomInput ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No matching options found
              </div>
            ) : groupedOptions ? (
              Object.entries(groupedOptions).map(([groupName, groupOpts]) => (
                <div key={groupName} className="py-1">
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    {groupName}
                  </div>
                  {groupOpts.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-blue-50 text-blue-700 font-semibold"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          {opt.icon && <span className="shrink-0 flex items-center justify-center">{opt.icon}</span>}
                          <span className="truncate">{opt.label}</span>
                          {opt.subLabel && (
                            <span className="text-xs text-slate-400 font-normal truncate">
                              ({opt.subLabel})
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {opt.icon && <span className="shrink-0 flex items-center justify-center">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-xs text-slate-400 font-normal truncate">
                          ({opt.subLabel})
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
