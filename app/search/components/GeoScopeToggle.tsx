"use client"

import { CITIES_BY_STATE } from "@/lib/data/cities"

export type GeoScope = "city" | "state" | "national"

interface GeoScopeToggleProps {
  scope: GeoScope
  onScopeChange: (scope: GeoScope) => void
  cityLabel?: string
  stateLabel?: string
  stateSublabel?: string
  userGeoLevel?: GeoScope
  onCitySelect?: (city: string) => void
}

export default function GeoScopeToggle({
  scope,
  onScopeChange,
  cityLabel = "Charlotte",
  stateLabel = "NC",
  stateSublabel = "North Carolina",
  userGeoLevel,
  onCitySelect,
}: GeoScopeToggleProps) {
  const citySublabel = cityLabel && stateLabel ? `${cityLabel}, ${stateLabel}` : undefined

  const options: { id: GeoScope; label: string; sublabel: string }[] = [
    { id: "city", label: cityLabel || "City", sublabel: citySublabel || "Your city" },
    { id: "state", label: stateLabel, sublabel: stateSublabel },
    { id: "national", label: "National", sublabel: "All US" },
  ]

  const visibleOptions = options.filter(opt => {
    if (!userGeoLevel || userGeoLevel === "national") return true
    if (userGeoLevel === "city") return opt.id !== "national"
    if (userGeoLevel === "state") return opt.id === "state"
    return true
  })

  const cities = stateLabel ? CITIES_BY_STATE[stateLabel] || [] : []

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex rounded-lg p-1"
        style={{
          backgroundColor: "rgba(0,0,0,0.025)",
          border: "1px solid rgba(0,0,0,0.06)",
          minWidth: visibleOptions.length >= 3 ? "360px" : visibleOptions.length === 2 ? "240px" : "120px",
        }}
      >
        {visibleOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onScopeChange(opt.id)}
            className="flex flex-col rounded-md px-4 py-2 text-left transition-colors flex-1"
            style={{
              backgroundColor: scope === opt.id ? "rgba(0,0,0,0.08)" : "transparent",
              fontFamily: "var(--font-body)",
            }}
          >
            <span className="text-sm font-medium" style={{ color: "#2C2519" }}>
              {opt.label}
            </span>
            <span className="text-[10px]" style={{ color: "rgba(0,0,0,0.5)" }}>
              {opt.sublabel}
            </span>
          </button>
        ))}
      </div>

      {/* City dropdown for state-onboarded users */}
      {userGeoLevel === "state" && cities.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value && onCitySelect) {
              onCitySelect(e.target.value)
            }
          }}
          className="rounded-md px-2.5 py-1.5 text-sm"
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            backgroundColor: "rgba(255,255,255,0.8)",
            color: "#2C2519",
            fontFamily: "var(--font-body)",
          }}
        >
          <option value="">Drill into city...</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
