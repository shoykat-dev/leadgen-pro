"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Country, State, City } from "country-state-city";
import { Search, Loader2, Globe, Layers, MapPin, Building2, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessLead } from "@/app/api/places/route";
import { SearchableSelect, SelectOption } from "@/components/searchable-select";
import { ALL_BUSINESS_SERVICES, getAreasForCity, getCountryFlag } from "@/lib/directory-data";
import { CountryFlag } from "@/components/country-flag";

interface SearchPanelProps {
  onSearch: (params: {
    country: string;
    countryCode: string;
    state: string;
    stateCode: string;
    city: string;
    area: string;
    category: string;
    categoryLabel: string;
    leads: BusinessLead[];
  }) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function SearchPanel({ onSearch, isLoading, setIsLoading }: SearchPanelProps) {
  // All countries
  const countries = useMemo(() => Country.getAllCountries(), []);

  // Selected values
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("BD");
  const [selectedStateCode, setSelectedStateCode] = useState<string>("13"); // Dhaka
  const [selectedCityName, setSelectedCityName] = useState<string>("Dhaka");
  const [selectedArea, setSelectedArea] = useState<string>("Banani");
  const [selectedCategory, setSelectedCategory] = useState<string>("restaurant");

  // Country options with visual country flag image on left
  const countryOptions: SelectOption[] = useMemo(() => {
    return countries.map((c) => ({
      value: c.isoCode,
      label: c.name,
      subLabel: c.isoCode,
      icon: <CountryFlag code={c.isoCode} name={c.name} size="sm" />,
    }));
  }, [countries]);

  // States list based on country (with automatic fallback for countries without ISO subdivisions)
  const states = useMemo(() => {
    if (!selectedCountryCode) return [];
    const countryStates = State.getStatesOfCountry(selectedCountryCode);
    if (countryStates.length > 0) return countryStates;

    const countryObj = countries.find((c) => c.isoCode === selectedCountryCode);
    const countryName = countryObj?.name || selectedCountryCode;
    return [
      {
        isoCode: selectedCountryCode,
        name: `${countryName} (National Region)`,
        countryCode: selectedCountryCode,
      },
    ];
  }, [selectedCountryCode, countries]);

  const stateOptions: SelectOption[] = useMemo(() => {
    return states.map((s) => ({
      value: s.isoCode,
      label: s.name,
      subLabel: s.isoCode,
    }));
  }, [states]);

  // Cities list based on country and state
  const cities = useMemo(() => {
    if (!selectedCountryCode || !selectedStateCode) return [];
    const stateCities = City.getCitiesOfState(selectedCountryCode, selectedStateCode);
    if (stateCities.length > 0) {
      return stateCities;
    }
    // Fallback if country-state-city doesn't have cities for a specific state or micro-nation
    const stateObj = states.find((s) => s.isoCode === selectedStateCode);
    const name = stateObj?.name?.replace(" (National Region)", "") || "Central";
    return [
      {
        name,
        countryCode: selectedCountryCode,
        stateCode: selectedStateCode,
        latitude: undefined,
        longitude: undefined,
      },
    ];
  }, [selectedCountryCode, selectedStateCode, states]);

  const cityOptions: SelectOption[] = useMemo(() => {
    return cities.map((c) => ({
      value: c.name,
      label: c.name,
    }));
  }, [cities]);

  // Areas list based on selected city
  const areaList = useMemo(() => {
    return getAreasForCity(selectedCityName);
  }, [selectedCityName]);

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

  // Handle Country change
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    const countryObj = countries.find((c) => c.isoCode === countryCode);
    const countryName = countryObj?.name || countryCode;
    const countryStates = State.getStatesOfCountry(countryCode);

    if (countryStates.length > 0) {
      const firstState = countryStates[0].isoCode;
      setSelectedStateCode(firstState);

      const stateCities = City.getCitiesOfState(countryCode, firstState);
      if (stateCities.length > 0) {
        const firstCity = stateCities[0].name;
        setSelectedCityName(firstCity);
        const cityAreas = getAreasForCity(firstCity);
        setSelectedArea(cityAreas[0] || "Central");
      } else {
        const stateName = countryStates[0].name;
        setSelectedCityName(stateName);
        const cityAreas = getAreasForCity(stateName);
        setSelectedArea(cityAreas[0] || "Central");
      }
    } else {
      // Micro-nation / city-state fallback
      setSelectedStateCode(countryCode);
      setSelectedCityName(countryName);
      const cityAreas = getAreasForCity(countryName);
      setSelectedArea(cityAreas[0] || "Downtown");
    }
  };

  // Handle State change
  const handleStateChange = (stateCode: string) => {
    setSelectedStateCode(stateCode);
    const stateCities = City.getCitiesOfState(selectedCountryCode, stateCode);
    if (stateCities.length > 0) {
      const firstCity = stateCities[0].name;
      setSelectedCityName(firstCity);
      const cityAreas = getAreasForCity(firstCity);
      setSelectedArea(cityAreas[0] || "Central");
    } else {
      const stateObj = states.find((s) => s.isoCode === stateCode);
      const name = stateObj?.name?.replace(" (National Region)", "") || "Central";
      setSelectedCityName(name);
      const cityAreas = getAreasForCity(name);
      setSelectedArea(cityAreas[0] || "Downtown");
    }
  };

  // Handle City change
  const handleCityChange = (cityName: string) => {
    setSelectedCityName(cityName);
    const cityAreas = getAreasForCity(cityName);
    setSelectedArea(cityAreas[0] || "Central");
  };

  // Run Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);

    try {
      const selectedCountryObj = countries.find(
        (c) => c.isoCode === selectedCountryCode
      );
      const selectedStateObj = states.find(
        (s) => s.isoCode === selectedStateCode
      );
      const selectedCityObj = cities.find(
        (c) => c.name === selectedCityName
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
        lat: selectedCityObj?.latitude ? parseFloat(selectedCityObj.latitude) : null,
        lon: selectedCityObj?.longitude ? parseFloat(selectedCityObj.longitude) : null,
      };

      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch leads from directory.");
      }

      onSearch({
        country: payload.country,
        countryCode: selectedCountryCode,
        state: payload.state,
        stateCode: selectedStateCode,
        city: selectedCityName || payload.area,
        area: selectedArea.trim(),
        category: selectedCategory,
        categoryLabel: categoryObj?.label || "Businesses",
        leads: data.businesses || [],
      });
    } catch (err: unknown) {
      console.error("Search failed:", err);
      alert(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching business data."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCountryObj = useMemo(
    () => countries.find((c) => c.isoCode === selectedCountryCode),
    [countries, selectedCountryCode]
  );
  const selectedStateObj = useMemo(
    () => states.find((s) => s.isoCode === selectedStateCode),
    [states, selectedStateCode]
  );

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
      <form onSubmit={handleSearch}>
        {/* 5 Cascading Searchable Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-3.5 xl:gap-4">
          {/* 1. Country Dropdown */}
          <SearchableSelect
            label="Country"
            icon={<Globe className="w-3.5 h-3.5 text-blue-600" />}
            placeholder="Select Country..."
            searchPlaceholder="Search country name or code..."
            value={selectedCountryCode}
            onChange={handleCountryChange}
            options={countryOptions}
            showSubLabelInTrigger={true}
          />

          {/* 2. State/Region Dropdown */}
          <SearchableSelect
            label="State / Region"
            icon={<Layers className="w-3.5 h-3.5 text-indigo-600" />}
            countBadge={
              <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full border border-indigo-200/50 whitespace-nowrap shrink-0">
                {states.length} Regions
              </span>
            }
            placeholder="Select State/Region..."
            searchPlaceholder="Search state or province..."
            value={selectedStateCode}
            onChange={handleStateChange}
            options={stateOptions}
            disabled={stateOptions.length === 0}
          />

          {/* 3. City Dropdown */}
          <SearchableSelect
            label="City"
            icon={<Building2 className="w-3.5 h-3.5 text-emerald-600" />}
            countBadge={
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200/50 whitespace-nowrap shrink-0">
                {cities.length} Cities
              </span>
            }
            placeholder="Select City..."
            searchPlaceholder="Search city name..."
            value={selectedCityName}
            onChange={handleCityChange}
            options={cityOptions}
            disabled={cityOptions.length === 0}
          />

          {/* 4. Area / Neighborhood Dropdown (with custom typing option) */}
          <SearchableSelect
            label="Area / Neighborhood"
            icon={<MapPin className="w-3.5 h-3.5 text-rose-500" />}
            countBadge={
              <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-full border border-rose-200/50 whitespace-nowrap shrink-0">
                {areaList.length} Areas
              </span>
            }
            placeholder="Select or type area..."
            searchPlaceholder="Search or type neighborhood..."
            value={selectedArea}
            onChange={setSelectedArea}
            options={areaOptions}
            allowCustomInput={true}
            customInputPlaceholder="Type custom area and press Enter"
          />

          {/* 5. Business Category / Service Dropdown (Comprehensive Real-World Services) */}
          <SearchableSelect
            label="Service / Category"
            icon={<Compass className="w-3.5 h-3.5 text-purple-600" />}
            countBadge={
              <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full border border-purple-200/50 whitespace-nowrap shrink-0">
                {categoryOptions.length} Services
              </span>
            }
            placeholder="Select Service..."
            searchPlaceholder="Search business services..."
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categoryOptions}
          />
        </div>

        {/* Location Breakdown Strip (Country Flag, States count, Cities count, Areas count) */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <CountryFlag code={selectedCountryCode} name={selectedCountryObj?.name} size="md" className="shadow-xs" />
            <span className="font-bold text-slate-900">
              {selectedCountryObj?.name || selectedCountryCode} Directory Hierarchy
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-indigo-700 font-semibold text-xs shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span><strong>{states.length}</strong> States / Regions</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-emerald-700 font-semibold text-xs shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              <span><strong>{cities.length}</strong> Cities in {selectedStateObj?.name || selectedStateCode}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-rose-700 font-semibold text-xs shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span><strong>{areaList.length}</strong> Business Areas in {selectedCityName}</span>
            </span>
          </div>
        </div>

        {/* Submit Button Row */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span>Searchable directory across 190+ countries with verified phone, email, and websites</span>
          </p>

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
