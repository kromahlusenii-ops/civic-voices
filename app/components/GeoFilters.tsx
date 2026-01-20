"use client";

import { useState, useRef, useEffect } from "react";
import statesData from "@/data/states.json";
import citiesData from "@/data/cities.json";

interface State {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
}

interface GeoFiltersProps {
  selectedState: string | null;
  selectedCity: string | null;
  onStateChange: (stateId: string | null) => void;
  onCityChange: (cityId: string | null) => void;
}

export default function GeoFilters({
  selectedState,
  selectedCity,
  onStateChange,
  onCityChange,
}: GeoFiltersProps) {
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const stateRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  const states: State[] = statesData;
  const cities: City[] = selectedState
    ? (citiesData as Record<string, City[]>)[selectedState] || []
    : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stateRef.current && !stateRef.current.contains(event.target as Node)) {
        setStateDropdownOpen(false);
        setStateSearch("");
      }
      if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
        setCityDropdownOpen(false);
        setCitySearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredStates = states.filter((state) =>
    state.name.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const filteredCities = cities.filter((city) =>
    city.name.toLowerCase().includes(citySearch.toLowerCase())
  );

  const selectedStateName = states.find((s) => s.id === selectedState)?.name || "Select state";
  const selectedCityName = cities.find((c) => c.id === selectedCity)?.name || "Select city";

  const handleStateSelect = (stateId: string) => {
    onStateChange(stateId);
    onCityChange(null); // Reset city when state changes
    setStateDropdownOpen(false);
    setStateSearch("");
  };

  const handleCitySelect = (cityId: string) => {
    onCityChange(cityId);
    setCityDropdownOpen(false);
    setCitySearch("");
  };

  return (
    <div className="flex items-center gap-2">
      {/* State Dropdown */}
      <div className="relative" ref={stateRef}>
        <button
          type="button"
          onClick={() => {
            setStateDropdownOpen(!stateDropdownOpen);
            setCityDropdownOpen(false);
          }}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-w-[140px]"
          data-testid="state-dropdown"
        >
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className={selectedState ? "text-gray-900" : "text-gray-500"}>
            {selectedStateName}
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ml-auto ${stateDropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {stateDropdownOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
                placeholder="Search states..."
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredStates.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No states found</div>
              ) : (
                filteredStates.map((state) => (
                  <button
                    key={state.id}
                    type="button"
                    onClick={() => handleStateSelect(state.id)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                      selectedState === state.id
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{state.name}</span>
                    {selectedState === state.id && (
                      <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* City Dropdown */}
      <div className="relative" ref={cityRef}>
        <button
          type="button"
          onClick={() => {
            if (selectedState) {
              setCityDropdownOpen(!cityDropdownOpen);
              setStateDropdownOpen(false);
            }
          }}
          disabled={!selectedState}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors min-w-[140px] ${
            selectedState
              ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
          data-testid="city-dropdown"
        >
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className={selectedCity ? "text-gray-900" : "text-gray-500"}>
            {selectedState ? selectedCityName : "Select state first"}
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ml-auto ${cityDropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {cityDropdownOpen && selectedState && (
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder="Search cities..."
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredCities.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No cities found</div>
              ) : (
                filteredCities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleCitySelect(city.id)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                      selectedCity === city.id
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{city.name}</span>
                    {selectedCity === city.id && (
                      <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
