"use client"

const SOURCES = ["Reddit", "X", "TikTok", "YouTube", "311 Data"]

export default function SourcesFooter() {
  return (
    <footer className="mt-12 space-y-2">
      <p
        className="section-label"
        style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.12em", color: "rgba(0,0,0,0.3)" }}
      >
        SOURCES
      </p>
      <div className="flex flex-wrap gap-2">
        {SOURCES.map((name) => (
          <span
            key={name}
            className="rounded-full px-3 py-1.5 text-xs"
            style={{
              backgroundColor: "rgba(0,0,0,0.025)",
              color: "rgba(0,0,0,0.5)",
              fontFamily: "var(--font-body)",
            }}
          >
            {name}
          </span>
        ))}
      </div>
    </footer>
  )
}
