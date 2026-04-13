"use client";

import { useEffect, useRef } from "react";

interface DataPoint {
  time: string;
  value: number;
}

interface EquityChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  loading?: boolean;
}

export default function EquityChart({
  data,
  height = 300,
  color = "#c9a84c",
  loading,
}: EquityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current || loading) return;

    let cancelled = false;

    import("lightweight-charts").then((lc) => {
      if (cancelled || !containerRef.current) return;

      const chart = lc.createChart(containerRef.current, {
        height,
        layout: {
          background: { type: lc.ColorType.Solid, color: "transparent" },
          textColor: "#6b7280",
          fontFamily: "Inter, sans-serif",
        },
        grid: {
          vertLines: { color: "#1a1f32" },
          horzLines: { color: "#1a1f32" },
        },
        rightPriceScale: {
          borderColor: "#1a1f32",
        },
        timeScale: {
          borderColor: "#1a1f32",
          timeVisible: false,
        },
        crosshair: {
          horzLine: { color: "#c9a84c40" },
          vertLine: { color: "#c9a84c40" },
        },
      });

      const series = chart.addSeries(lc.AreaSeries, {
        lineColor: color,
        topColor: `${color}30`,
        bottomColor: `${color}05`,
        lineWidth: 2,
      });

      if (data.length > 0) {
        series.setData(data);
        chart.timeScale().fitContent();
      }

      chartRef.current = chart;

      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener("resize", handleResize);

      // Store cleanup for the outer effect
      (containerRef.current as any).__cleanup = () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
        chartRef.current = null;
      };
    });

    return () => {
      cancelled = true;
      const el = containerRef.current as any;
      if (el?.__cleanup) {
        el.__cleanup();
        delete el.__cleanup;
      }
    };
  }, [data, height, color, loading]);

  if (loading) {
    return (
      <div
        className="bg-navy-card rounded-xl animate-pulse"
        style={{ height }}
      />
    );
  }

  return <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />;
}
