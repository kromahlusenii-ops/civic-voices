"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// Info icon component
function InfoIcon({ tooltip }: { tooltip: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block z-30">
      <button
        className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="More information"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path strokeWidth="2" d="M12 16v-4m0-4h.01" />
        </svg>
      </button>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-normal max-w-[200px] sm:max-w-xs">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

interface DataPoint {
  date: string;
  count: number;
  engagement: number;
  views?: number;
}

interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
}

type ChartMode = "volume" | "sentiment";

export interface DataPointClickEvent {
  date: string;
  count: number;
  views: number;
  engagement: number;
  formattedDate: string;
}

interface ActivityChartProps {
  data: DataPoint[];
  sentimentData?: SentimentData;
  height?: number;
  mode?: ChartMode;
  onModeChange?: (mode: ChartMode) => void;
  onDataPointClick?: (event: DataPointClickEvent) => void;
}

export default function ActivityChart({
  data,
  sentimentData,
  height = 280,
  mode = "volume",
  onModeChange,
  onDataPointClick,
}: ActivityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });
  const [activeMode, setActiveMode] = useState<ChartMode>(mode);
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    date: string;
    count: number;
    engagement: number;
    views: number;
  } | null>(null);

  const handleModeChange = (newMode: ChartMode) => {
    setActiveMode(newMode);
    onModeChange?.(newMode);
  };

  // Handle responsive width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [height]);

  // Draw chart
  useEffect(() => {
    if (!svgRef.current || data.length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Responsive margins - smaller on mobile
    const isMobile = dimensions.width < 400;
    const margin = {
      top: 20,
      right: isMobile ? 45 : 60,
      bottom: isMobile ? 40 : 50,
      left: isMobile ? 45 : 60,
    };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    // Responsive sizes for touch targets and fonts
    const dotRadius = isMobile ? 5 : 4;
    const dotRadiusHover = isMobile ? 8 : 6;
    const axisFontSize = isMobile ? "10px" : "11px";

    // Parse dates
    const parseDate = d3.timeParse("%Y-%m-%d");
    const chartData = data.map((d) => ({
      ...d,
      parsedDate: parseDate(d.date) || new Date(d.date),
      views: d.views ?? d.engagement * 15, // Estimate views if not provided
    }));

    // Create scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(chartData, (d) => d.parsedDate) as [Date, Date])
      .range([0, innerWidth]);

    // Left Y axis - Views
    const yScaleViews = d3
      .scaleLinear()
      .domain([0, (d3.max(chartData, (d) => d.views) || 0) * 1.1])
      .nice()
      .range([innerHeight, 0]);

    // Right Y axis - Mentions (count)
    const yScaleMentions = d3
      .scaleLinear()
      .domain([0, (d3.max(chartData, (d) => d.count) || 0) * 1.1])
      .nice()
      .range([innerHeight, 0]);

    // Create line generators
    const lineViews = d3
      .line<(typeof chartData)[0]>()
      .x((d) => xScale(d.parsedDate))
      .y((d) => yScaleViews(d.views))
      .curve(d3.curveMonotoneX);

    const lineMentions = d3
      .line<(typeof chartData)[0]>()
      .x((d) => xScale(d.parsedDate))
      .y((d) => yScaleMentions(d.count))
      .curve(d3.curveMonotoneX);

    // Add group for margins
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add gradient definitions
    const defs = svg.append("defs");

    // Blue gradient for views
    const gradientViews = defs
      .append("linearGradient")
      .attr("id", "area-gradient-views")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradientViews
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.2);

    gradientViews
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0);

    // Area for views
    const areaViews = d3
      .area<(typeof chartData)[0]>()
      .x((d) => xScale(d.parsedDate))
      .y0(innerHeight)
      .y1((d) => yScaleViews(d.views))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(chartData)
      .attr("fill", "url(#area-gradient-views)")
      .attr("d", areaViews);

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(yScaleViews.ticks(5))
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yScaleViews(d))
      .attr("y2", (d) => yScaleViews(d))
      .attr("stroke", "#f3f4f6")
      .attr("stroke-dasharray", "3,3");

    // Add X axis - fewer ticks on mobile
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(isMobile ? Math.min(chartData.length, 4) : Math.min(chartData.length, 7))
      .tickFormat(d3.timeFormat(isMobile ? "%m/%d" : "%b %d") as (d: Date | d3.NumberValue) => string);

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "#6b7280")
      .attr("font-size", axisFontSize);

    // Left Y axis (Views) - Blue
    g.append("g")
      .attr("class", "y-axis-left")
      .call(
        d3.axisLeft(yScaleViews)
          .ticks(isMobile ? 4 : 5)
          .tickFormat((d) => formatNumber(d as number))
      )
      .selectAll("text")
      .attr("fill", "#3b82f6")
      .attr("font-size", axisFontSize);

    // Right Y axis (Mentions) - Orange
    g.append("g")
      .attr("class", "y-axis-right")
      .attr("transform", `translate(${innerWidth}, 0)`)
      .call(
        d3.axisRight(yScaleMentions)
          .ticks(isMobile ? 4 : 5)
          .tickFormat((d) => formatNumber(d as number))
      )
      .selectAll("text")
      .attr("fill", "#f97316")
      .attr("font-size", axisFontSize);

    // Style axis lines
    g.selectAll(".domain").attr("stroke", "#e5e7eb");
    g.selectAll(".tick line").attr("stroke", "#e5e7eb");

    // Add Views line (blue)
    g.append("path")
      .datum(chartData)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2.5)
      .attr("d", lineViews);

    // Add Mentions line (orange)
    g.append("path")
      .datum(chartData)
      .attr("fill", "none")
      .attr("stroke", "#f97316")
      .attr("stroke-width", 2.5)
      .attr("d", lineMentions);

    // Add dots for Views data points - larger on mobile for touch
    g.selectAll(".dot-views")
      .data(chartData)
      .join("circle")
      .attr("class", "dot-views")
      .attr("cx", (d) => xScale(d.parsedDate))
      .attr("cy", (d) => yScaleViews(d.views))
      .attr("r", dotRadius)
      .attr("fill", "#3b82f6")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this).transition().duration(100).attr("r", dotRadiusHover);
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltip({
          show: true,
          x,
          y: y - 10,
          date: d.date,
          count: d.count,
          engagement: d.engagement,
          views: d.views,
        });
      })
      .on("mouseleave", function () {
        d3.select(this).transition().duration(100).attr("r", dotRadius);
        setTooltip(null);
      })
      .on("click", function (_event, d) {
        if (onDataPointClick) {
          onDataPointClick({
            date: d.date,
            count: d.count,
            views: d.views,
            engagement: d.engagement,
            formattedDate: formatDate(d.date),
          });
        }
      });

    // Add dots for Mentions data points - larger on mobile for touch
    g.selectAll(".dot-mentions")
      .data(chartData)
      .join("circle")
      .attr("class", "dot-mentions")
      .attr("cx", (d) => xScale(d.parsedDate))
      .attr("cy", (d) => yScaleMentions(d.count))
      .attr("r", dotRadius)
      .attr("fill", "#f97316")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this).transition().duration(100).attr("r", dotRadiusHover);
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltip({
          show: true,
          x,
          y: y - 10,
          date: d.date,
          count: d.count,
          engagement: d.engagement,
          views: d.views,
        });
      })
      .on("mouseleave", function () {
        d3.select(this).transition().duration(100).attr("r", dotRadius);
        setTooltip(null);
      })
      .on("click", function (_event, d) {
        if (onDataPointClick) {
          onDataPointClick({
            date: d.date,
            count: d.count,
            views: d.views,
            engagement: d.engagement,
            formattedDate: formatDate(d.date),
          });
        }
      });

    // Find peak point and add star marker
    const peakPoint = chartData.reduce((max, d) =>
      d.views > max.views ? d : max
    );
    const peakX = xScale(peakPoint.parsedDate);
    const peakY = yScaleViews(peakPoint.views);

    // Add star marker at peak
    g.append("text")
      .attr("x", peakX)
      .attr("y", peakY - 12)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text("\u2B50");

  }, [data, dimensions, activeMode, onDataPointClick]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg"
        style={{ height }}
      >
        <p className="text-gray-500 text-sm">No activity data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm overflow-visible">
      {/* Header with tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4 overflow-visible">
        <div className="flex items-center overflow-visible relative z-20">
          <h3 className="text-sm font-semibold text-gray-800">Activity over time</h3>
          <InfoIcon tooltip="Tracks views and post mentions over the search time period. Views are from platform data when available, otherwise estimated from engagement." />
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 self-start sm:self-auto">
          <button
            onClick={() => handleModeChange("volume")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeMode === "volume"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Volume
          </button>
          <button
            onClick={() => handleModeChange("sentiment")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeMode === "sentiment"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Sentiment
          </button>
        </div>
      </div>

      {/* Volume Chart - always mounted to preserve ref, hidden when not active */}
      <div className={activeMode === "volume" ? "" : "hidden"}>
        <div ref={containerRef} className="relative w-full min-w-0">
          <svg
            ref={svgRef}
            width="100%"
            height={dimensions.height}
            viewBox={dimensions.width > 0 ? `0 0 ${dimensions.width} ${dimensions.height}` : undefined}
            preserveAspectRatio="xMidYMid meet"
            style={{ maxWidth: '100%', display: 'block' }}
          />
          {tooltip?.show && (
            <div
              className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="font-medium mb-1">{formatDate(tooltip.date)}</div>
              <div className="flex items-center gap-2 text-blue-300">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {formatNumber(tooltip.views)} views
              </div>
              <div className="flex items-center gap-2 text-orange-300">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                {tooltip.count} mentions
              </div>
              {onDataPointClick && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-700 text-purple-300">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  <span>Click for AI insight</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Volume Legend */}
        <div className="flex flex-col items-center gap-2 mt-3 sm:mt-4 pt-3 border-t border-gray-100 overflow-visible">
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5 sm:gap-2 relative z-20">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500"></span>
              <span className="text-[10px] sm:text-xs text-gray-600">Views</span>
              <InfoIcon tooltip="Total content views. Direct from platform APIs when available, otherwise estimated as ~15x engagement." />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 relative z-20">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-orange-500"></span>
              <span className="text-[10px] sm:text-xs text-gray-600">Mentions</span>
              <InfoIcon tooltip="Number of posts matching your search query on this date." />
            </div>
          </div>
          {onDataPointClick && (
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              Click any data point for AI-powered insights
            </p>
          )}
        </div>
      </div>

      {/* Sentiment Chart */}
      {activeMode === "sentiment" && sentimentData && (
        <SentimentChart data={sentimentData} height={height} />
      )}

      {/* No sentiment data message */}
      {activeMode === "sentiment" && !sentimentData && (
        <div
          className="flex items-center justify-center bg-gray-50 rounded-lg"
          style={{ height }}
        >
          <p className="text-gray-500 text-sm">No sentiment data available</p>
        </div>
      )}
    </div>
  );
}

// Sentiment breakdown chart component
function SentimentChart({ data, height }: { data: SentimentData; height: number }) {
  const total = data.positive + data.negative + data.neutral;
  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg"
        style={{ height }}
      >
        <p className="text-gray-500 text-sm">No sentiment data available</p>
      </div>
    );
  }

  const positivePercent = Math.round((data.positive / total) * 100);
  const negativePercent = Math.round((data.negative / total) * 100);
  const neutralPercent = Math.round((data.neutral / total) * 100);

  const sentimentItems = [
    { label: "Positive", value: data.positive, percent: positivePercent, color: "bg-green-500", textColor: "text-green-600" },
    { label: "Neutral", value: data.neutral, percent: neutralPercent, color: "bg-gray-400", textColor: "text-gray-600" },
    { label: "Negative", value: data.negative, percent: negativePercent, color: "bg-red-500", textColor: "text-red-600" },
  ];

  return (
    <div className="space-y-6" style={{ minHeight: height - 40 }}>
      {/* Stacked bar */}
      <div className="space-y-2">
        <div className="flex h-8 rounded-full overflow-hidden">
          {positivePercent > 0 && (
            <div
              className="bg-green-500 transition-all flex items-center justify-center"
              style={{ width: `${positivePercent}%` }}
            >
              {positivePercent >= 10 && (
                <span className="text-white text-xs font-medium">{positivePercent}%</span>
              )}
            </div>
          )}
          {neutralPercent > 0 && (
            <div
              className="bg-gray-400 transition-all flex items-center justify-center"
              style={{ width: `${neutralPercent}%` }}
            >
              {neutralPercent >= 10 && (
                <span className="text-white text-xs font-medium">{neutralPercent}%</span>
              )}
            </div>
          )}
          {negativePercent > 0 && (
            <div
              className="bg-red-500 transition-all flex items-center justify-center"
              style={{ width: `${negativePercent}%` }}
            >
              {negativePercent >= 10 && (
                <span className="text-white text-xs font-medium">{negativePercent}%</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-3 gap-4">
        {sentimentItems.map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${item.textColor}`}>
              {item.percent}%
            </div>
            <div className="text-sm text-gray-600 mt-1">{item.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {formatNumber(item.value)} posts
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span className="text-xs text-gray-600">Positive</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-400"></span>
          <span className="text-xs text-gray-600">Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-xs text-gray-600">Negative</span>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}
