"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Country } from "country-state-city";
import {
  Search,
  Loader2,
  Globe,
  Layers,
  MapPin,
  Building2,
  Compass,
  AlertCircle,
  Radar,
  FileSpreadsheet,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessLead } from "@/app/api/places/route";
import { SearchableSelect, SelectOption } from "@/components/searchable-select";
import { ALL_BUSINESS_SERVICES } from "@/lib/directory-data";
import { CountryFlag } from "@/components/country-flag";
import {
  getStatesForCountry,
  getCitiesForState,
  getAreasForHierarchyCity,
} from "@/lib/location-hierarchy";

interface SearchPanelProps {
  onSearch: (params: {
    country: string;
    countryCode: string;
    state: string;
    stateCode: string;
    city: string;
    area: string;
    radiusMeters?: number;
    category: string;
    categoryLabel: string;
    leads: BusinessLead[];
    cached?: boolean;
    lastUpdated?: string;
  }) => void;
  onLocationChange?: (location: {
    country: string;
    countryCode: string;
    state: string;
    stateCode: string;
    city: string;
    area: string;
  }) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onOpenAreaScan?: (location: { area: string; city: string; countryCode: string }) => void;
  onOpenCsvImport?: () => void;
  onOpenAddLead?: () => void;
}

export function SearchPanel({
  onSearch,
  onLocationChange,
  isLoading,
  setIsLoading,
  onOpenAreaScan,
  onOpenCsvImport,
  onOpenAddLead,
}: SearchPanelProps) {
  // All countries
  const countries = useMemo(() => Country.getAllCountries(), []);

  // Selected values
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("BD");
  const [selectedStateCode, setSelectedStateCode] = useState<string>("DHAKA");
  const [selectedCityName, setSelectedCityName] = useState<string>("Dhaka");
  const [selectedArea, setSelectedArea] = useState<string>("Banani");
  const [selectedCategory, setSelectedCategory] = useState<string>("restaurant");
  const [searchError, setSearchError] = useState<string | null>(null);

  const PROGRESS_MESSAGES = [
    "Connecting to OpenStreetMap directory mirrors...",
    "Querying nodes, ways & relations across multi-tag criteria...",
    "Validating business coordinates and contact channels...",
    "Applying Haversine radial distance post-filter...",
  ];
  const [progressIndex, setProgressIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgressIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setProgressIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Country options with visual country flag image on left
  const countryOptions: SelectOption[] = useMemo(() => {
    return countries.map((c) => ({
      value: c.isoCode,
      label: c.name,
      subLabel: c.isoCode,
      icon: <CountryFlag code={c.isoCode} name={c.name} size="sm" />,
    }));
  }, [countries]);

  // States/Divisions list based on country using our authoritative verified hierarchy
  const states = useMemo(() => {
    if (!selectedCountryCode) return [];
    return getStatesForCountry(selectedCountryCode);
  }, [selectedCountryCode]);

  const stateOptions: SelectOption[] = useMemo(() => {
    return states.map((s) => ({
      value: s.code,
      label: s.name,
      subLabel: s.code,
    }));
  }, [states]);

  // Cities/Districts list based on country and state
  const cities = useMemo(() => {
    if (!selectedCountryCode || !selectedStateCode) return [];
    return getCitiesForState(selectedCountryCode, selectedStateCode);
  }, [selectedCountryCode, selectedStateCode]);

  const cityOptions: SelectOption[] = useMemo(() => {
    return cities.map((c) => ({
      value: c.name,
      label: c.name,
    }));
  }, [cities]);

  // Areas/Thanas/Upazilas list based on selected city
  const areaList = useMemo(() => {
    return getAreasForHierarchyCity(selectedCountryCode, selectedStateCode, selectedCityName);
  }, [selectedCountryCode, selectedStateCode, selectedCityName]);

  const areaOptions: SelectOption[] = useMemo(() => {
    return areaList.map((a) => ({
      value: a,
      label: a,
      icon: "📍",
    }));
  }, [areaList]);

  // Category options from ALL_BUSINESS_SERVICES
  const categoryOptions: SelectOption[] = useMemo(() => {
    return ALL_BUSINESS_SERVICES.map((cat) => ({
      value: cat.id,
      label: cat.label,
      group: cat.group,
      icon: cat.icon,
    }));
  }, []);

  // Handle Country change: consistently resets all child dropdowns and results header
  const handleCountryChange = (countryCode: string) => {
    if (searchError) setSearchError(null);
    setSelectedCountryCode(countryCode);
    const countryObj = countries.find((c) => c.isoCode === countryCode);
    const countryName = countryObj?.name || countryCode;

    const newStates = getStatesForCountry(countryCode);
    let nextStateCode = "";
    let nextStateName = "";
    let nextCityName = "";
    let nextAreaName = "";

    if (newStates.length > 0) {
      nextStateCode = newStates[0].code;
      nextStateName = newStates[0].name;
      setSelectedStateCode(nextStateCode);

      const newCities = getCitiesForState(countryCode, nextStateCode);
      if (newCities.length > 0) {
        nextCityName = newCities[0].name;
        setSelectedCityName(nextCityName);
        const newAreas = getAreasForHierarchyCity(countryCode, nextStateCode, nextCityName);
        nextAreaName = newAreas[0] || nextCityName;
        setSelectedArea(nextAreaName);
      } else {
        nextCityName = nextStateName;
        nextAreaName = nextCityName;
        setSelectedCityName(nextCityName);
        setSelectedArea(nextAreaName);
      }
    } else {
      nextStateCode = "ALL";
      nextStateName = countryName;
      nextCityName = countryName;
      nextAreaName = countryName;
      setSelectedStateCode(nextStateCode);
      setSelectedCityName(nextCityName);
      setSelectedArea(nextAreaName);
    }

    onLocationChange?.({
      country: countryName,
      countryCode,
      state: nextStateName,
      stateCode: nextStateCode,
      city: nextCityName,
      area: nextAreaName,
    });
  };

  // Handle State / Division change
  const handleStateChange = (stateCode: string) => {
    if (searchError) setSearchError(null);
    setSelectedStateCode(stateCode);
    const stateObj = states.find((s) => s.code === stateCode);
    const stateName = stateObj?.name || stateCode;

    const newCities = getCitiesForState(selectedCountryCode, stateCode);
    let nextCityName = "";
    let nextAreaName = "";

    if (newCities.length > 0) {
      nextCityName = newCities[0].name;
      setSelectedCityName(nextCityName);
      const newAreas = getAreasForHierarchyCity(selectedCountryCode, stateCode, nextCityName);
      nextAreaName = newAreas[0] || nextCityName;
      setSelectedArea(nextAreaName);
    } else {
      nextCityName = stateName;
      nextAreaName = nextCityName;
      setSelectedCityName(nextCityName);
      setSelectedArea(nextAreaName);
    }

    const countryObj = countries.find((c) => c.isoCode === selectedCountryCode);
    onLocationChange?.({
      country: countryObj?.name || selectedCountryCode,
      countryCode: selectedCountryCode,
      state: stateName,
      stateCode,
      city: nextCityName,
      area: nextAreaName,
    });
  };

  // Handle City / District change
  const handleCityChange = (cityName: string) => {
    if (searchError) setSearchError(null);
    setSelectedCityName(cityName);
    const newAreas = getAreasForHierarchyCity(selectedCountryCode, selectedStateCode, cityName);
    const nextAreaName = newAreas[0] || cityName;
    setSelectedArea(nextAreaName);

    const countryObj = countries.find((c) => c.isoCode === selectedCountryCode);
    const stateObj = states.find((s) => s.code === selectedStateCode);
    onLocationChange?.({
      country: countryObj?.name || selectedCountryCode,
      countryCode: selectedCountryCode,
      state: stateObj?.name || selectedStateCode,
      stateCode: selectedStateCode,
      city: cityName,
      area: nextAreaName,
    });
  };

  // Handle Area change
  const handleAreaChange = (areaName: string) => {
    if (searchError) setSearchError(null);
    setSelectedArea(areaName);

    const countryObj = countries.find((c) => c.isoCode === selectedCountryCode);
    const stateObj = states.find((s) => s.code === selectedStateCode);
    onLocationChange?.({
      country: countryObj?.name || selectedCountryCode,
      countryCode: selectedCountryCode,
      state: stateObj?.name || selectedStateCode,
      stateCode: selectedStateCode,
      city: selectedCityName,
      area: areaName,
    });
  };

  // Run Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    if (searchError) setSearchError(null);
    setIsLoading(true);

    try {
      const selectedCountryObj = countries.find(
        (c) => c.isoCode === selectedCountryCode
      );
      const selectedStateObj = states.find(
        (s) => s.code === selectedStateCode
      );
      const categoryObj = ALL_BUSINESS_SERVICES.find(
        (cat) => cat.id === selectedCategory
      );

      const payload = {
        country: selectedCountryObj?.name || selectedCountryCode,
        countryCode: selectedCountryCode,
        state: selectedStateObj?.name || selectedStateCode,
        stateCode: selectedStateCode,
        city: selectedCityName || selectedStateObj?.name || "Dhaka",
        area: selectedArea.trim() || selectedCityName,
        category: selectedCategory,
        categoryLabel: categoryObj?.label || selectedCategory,
        lat: null,
        lon: null,
      };

      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg =
          data?.error?.message ||
          (typeof data?.error === "string" ? data.error : null) ||
          "Could not load results. Please try again.";
        throw new Error(errorMsg);
      }

      onSearch({
        country: payload.country,
        countryCode: selectedCountryCode,
        state: payload.state,
        stateCode: selectedStateCode,
        city: selectedCityName || payload.area,
        area: selectedArea.trim(),
        radiusMeters: data?.areaConfig?.radiusMeters || 2000,
        category: selectedCategory,
        categoryLabel: categoryObj?.label || "Businesses",
        leads: data?.businesses || [],
        cached: data?.cached,
        lastUpdated: data?.lastUpdated,
      });
    } catch (err: unknown) {
      console.error("Search failed:", err);
      const friendlyMessage =
        err instanceof Error && err.message
          ? err.message
          : "Could not load results. Please try again.";
      setSearchError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCountryObj = useMemo(
    () => countries.find((c) => c.isoCode === selectedCountryCode),
    [countries, selectedCountryCode]
  );
  const selectedStateObj = useMemo(
    () => states.find((s) => s.code === selectedStateCode),
    [states, selectedStateCode]
  );

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-3.5 sm:p-6 shadow-sm transition-colors duration-200">
      <form onSubmit={handleSearch}>
        {/* 5 Cascading Searchable Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-3.5 xl:gap-4">
          {/* 1. Country Dropdown */}
          <SearchableSelect
            label="Country"
            icon={<Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
            placeholder="Select Country..."
            searchPlaceholder="Search country name or code..."
            value={selectedCountryCode}
            onChange={handleCountryChange}
            options={countryOptions}
            showSubLabelInTrigger={true}
          />

          {/* 2. State / Region Dropdown */}
          <SearchableSelect
            label="State / Region"
            icon={<Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
            countBadge={
              <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-900/50 whitespace-nowrap shrink-0">
                {states.length} Regions
              </span>
            }
            placeholder="Select State or Region..."
            searchPlaceholder="Search state, province, or region..."
            value={selectedStateCode}
            onChange={handleStateChange}
            options={stateOptions}
            disabled={stateOptions.length === 0}
          />

          {/* 3. City / District Dropdown */}
          <SearchableSelect
            label="City / District"
            icon={<Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
            countBadge={
              <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-900/50 whitespace-nowrap shrink-0">
                {cities.length} Cities
              </span>
            }
            placeholder="Select City or District..."
            searchPlaceholder="Search city or district name..."
            value={selectedCityName}
            onChange={handleCityChange}
            options={cityOptions}
            disabled={cityOptions.length === 0}
          />

          {/* 4. Area / Neighborhood Dropdown (with custom typing option) */}
          <SearchableSelect
            label="Area / Neighborhood"
            icon={<MapPin className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />}
            countBadge={
              <span className="text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-full border border-rose-200/50 dark:border-rose-900/50 whitespace-nowrap shrink-0">
                {areaList.length} Areas
              </span>
            }
            placeholder="Select or type area..."
            searchPlaceholder="Search or type neighborhood..."
            value={selectedArea}
            onChange={handleAreaChange}
            options={areaOptions}
            allowCustomInput={true}
            customInputPlaceholder="Type custom area and press Enter"
          />

          {/* 5. Business Category / Service Dropdown */}
          <SearchableSelect
            label="Service / Category"
            icon={<Compass className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
            countBadge={
              <span className="text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-200/50 dark:border-purple-900/50 whitespace-nowrap shrink-0">
                {categoryOptions.length} Services
              </span>
            }
            placeholder="Select Service..."
            searchPlaceholder="Search business services..."
            value={selectedCategory}
            onChange={(cat) => {
              if (searchError) setSearchError(null);
              setSelectedCategory(cat);
            }}
            options={categoryOptions}
          />
        </div>

        {/* Location Breakdown Strip (Country Flag, States count, Cities count, Areas count) */}
        <div className="mt-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
            <CountryFlag code={selectedCountryCode} name={selectedCountryObj?.name} size="md" className="shadow-xs shrink-0" />
            <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
              {selectedCountryObj?.name || selectedCountryCode} Directory Hierarchy
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-400 font-semibold text-[11px] sm:text-xs shadow-2xs">
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-500 shrink-0" />
              <span><strong>{states.length}</strong> States</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] sm:text-xs shadow-2xs">
              <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 shrink-0" />
              <span><strong>{cities.length}</strong> Cities ({selectedStateObj?.name || selectedStateCode})</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-700 dark:text-rose-400 font-semibold text-[11px] sm:text-xs shadow-2xs">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500 shrink-0" />
              <span><strong>{areaList.length}</strong> Areas ({selectedCityName})</span>
            </span>
          </div>
        </div>

        {/* Dynamic Loading Progress Banner */}
        {isLoading && (
          <div className="mt-3.5 p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 flex items-center gap-2.5 text-xs sm:text-sm animate-in fade-in-50 duration-200">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-semibold">{PROGRESS_MESSAGES[progressIndex]}</span>
          </div>
        )}

        {/* Inline Friendly Error State with Retry Button */}
        {searchError && !isLoading && (
          <div className="mt-3.5 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold">{searchError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                onClick={() => handleSearch()}
                className="h-7 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
              >
                Try Again
              </Button>
              <button
                type="button"
                onClick={() => setSearchError(null)}
                className="px-2 py-1 rounded-md text-xs font-medium hover:bg-amber-500/20 text-slate-600 dark:text-slate-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Submit and Action Buttons Row */}
        <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-3.5 sm:pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2">
            {onOpenAreaScan && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onOpenAreaScan({
                    area: selectedArea,
                    city: selectedCityName,
                    countryCode: selectedCountryCode,
                  })
                }
                className="h-9 sm:h-10 px-2 sm:px-3.5 rounded-xl border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-[11px] sm:text-xs font-semibold gap-1 sm:gap-1.5 justify-center"
              >
                <Radar className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
                <span className="truncate">Area Scan</span>
              </Button>
            )}

            {onOpenCsvImport && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenCsvImport}
                className="h-9 sm:h-10 px-2 sm:px-3 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] sm:text-xs font-semibold gap-1 sm:gap-1.5 justify-center"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Import CSV</span>
              </Button>
            )}

            {onOpenAddLead && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenAddLead}
                className="h-9 sm:h-10 px-2 sm:px-3 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] sm:text-xs font-semibold gap-1 sm:gap-1.5 justify-center"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">Add Lead</span>
              </Button>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            size="lg"
            className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 rounded-xl h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Searching Businesses...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search Businesses</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
