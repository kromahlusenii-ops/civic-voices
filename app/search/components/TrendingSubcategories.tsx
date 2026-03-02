"use client"

// Mock data from prompt
const TRENDING: { name: string; score: number; categoryColor: string }[] = [
  { name: "Immigration Enforcement", score: 91, categoryColor: "#2E7D32" },
  { name: "Childcare", score: 84, categoryColor: "#4A90D9" },
  { name: "Affordable Housing", score: 72, categoryColor: "#D4654A" },
  { name: "Voting Rights", score: 62, categoryColor: "#B06080" },
  { name: "K-12 Education", score: 58, categoryColor: "#D4A24A" },
  { name: "Cost of Living", score: 51, categoryColor: "#C07A3E" },
  { name: "Public Transit", score: 45, categoryColor: "#8B6DB0" },
]

interface TrendingSubcategoriesProps {
  onSubcategoryClick?: (name: string) => void
}

export default function TrendingSubcategories({ onSubcategoryClick }: TrendingSubcategoriesProps) {
  return (
    <section className="space-y-3">
      <p
        className="section-label"
        style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em", color: "rgba(0,0,0,0.3)" }}
      >
        TRENDING SUBCATEGORIES
      </p>
      <div className="flex flex-wrap gap-2">
        {TRENDING.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onSubcategoryClick?.(item.name)}
            className="rounded-full px-4 py-2 text-sm transition-colors"
            style={{
              backgroundColor: "rgba(0,0,0,0.025)",
              border: "1px solid rgba(0,0,0,0.06)",
              color: "#2C2519",
              fontFamily: "var(--font-body)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${item.categoryColor}20`
              e.currentTarget.style.borderColor = `${item.categoryColor}60`
              e.currentTarget.style.color = item.categoryColor
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.025)"
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)"
              e.currentTarget.style.color = "#2C2519"
            }}
          >
            <span className="font-medium">{item.name}</span>
            <span className="ml-2 text-xs" style={{ color: "rgba(0,0,0,0.4)" }}>
              {item.score}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
