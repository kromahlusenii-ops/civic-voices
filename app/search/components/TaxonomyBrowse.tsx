"use client"

import { useState } from "react"
import { TAXONOMY, type TaxonomyCategory, type Subcategory } from "@/lib/data/taxonomy"

interface TaxonomyBrowseProps {
  onSelectSubcategory: (query: string, subcategoryName: string) => void
}

export default function TaxonomyBrowse({ onSelectSubcategory }: TaxonomyBrowseProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const handleSubcategoryClick = (sub: Subcategory) => {
    onSelectSubcategory(sub.searchQuery, sub.name)
  }

  const handleCategoryClick = (cat: TaxonomyCategory) => {
    if (expandedCategory === cat.id) {
      setExpandedCategory(null)
      return
    }
    setExpandedCategory(cat.id)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[rgba(0,0,0,0.5)]">
        Browse by civic topic -- click a category, then pick a subcategory to search
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TAXONOMY.map((cat) => (
          <div
            key={cat.id}
            className="rounded-lg border transition-colors"
            style={{
              borderColor: "rgba(0,0,0,0.06)",
              backgroundColor: "rgba(0,0,0,0.025)",
            }}
          >
            <button
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-[rgba(0,0,0,0.04)]"
              style={{
                borderLeft: `3px solid ${cat.color}`,
                color: "#2C2519",
              }}
            >
              <span className="text-base">{cat.icon}</span>
              <span className="flex-1 whitespace-nowrap">{cat.name}</span>
              <svg
                className={`h-4 w-4 flex-shrink-0 transition-transform ${
                  expandedCategory === cat.id ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedCategory === cat.id && (
              <div className="border-t px-3 py-2" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                <div className="flex flex-wrap gap-1.5">
                  {cat.subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubcategoryClick(sub)}
                      className="rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
                      style={{
                        backgroundColor: `${cat.color}20`,
                        color: cat.color,
                      }}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
