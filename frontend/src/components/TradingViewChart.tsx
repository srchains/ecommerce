import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, AreaSeries } from 'lightweight-charts';

interface HistoryPoint {
  timestamp: string;
  rate: number;
}

interface TradingViewChartProps {
  history: HistoryPoint[];
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ history }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create the lightweight chart instance
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      width: containerRef.current.clientWidth,
      height: 260,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#e5e7eb',
        rightOffset: 5,
        barSpacing: 6,
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#9ca3af',
          width: 1,
          style: 3, // dashed line
          labelBackgroundColor: '#111827',
        },
        horzLine: {
          color: '#9ca3af',
          width: 1,
          style: 3, // dashed line
          labelBackgroundColor: '#111827',
        },
      },
    });

    // Add Area series styled to match dashboard palette using v5 API
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#111827',
      topColor: 'rgba(17, 24, 39, 0.15)',
      bottomColor: 'rgba(17, 24, 39, 0.01)',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    // Responsive auto-fit resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !containerRef.current) return;
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update data on props changes
  useEffect(() => {
    if (!seriesRef.current || !history || history.length === 0) return;

    // Convert history points to lightweight-charts format safely
    const chartData = history
      .map((h) => {
        if (!h || !h.timestamp || typeof h.rate !== 'number') return null;
        const timeMs = new Date(h.timestamp).getTime();
        if (isNaN(timeMs)) return null;
        return {
          time: Math.floor(timeMs / 1000),
          value: h.rate,
        };
      })
      .filter((d): d is { time: number; value: number } => d !== null);

    // Filter duplicates (ensures strict uniqueness) and sort chronologically (ascending)
    const seenTimes = new Set<number>();
    const uniqueData: { time: number; value: number }[] = [];

    for (const d of chartData) {
      if (!seenTimes.has(d.time)) {
        seenTimes.add(d.time);
        uniqueData.push(d);
      }
    }

    uniqueData.sort((a, b) => a.time - b.time);

    if (uniqueData.length > 0) {
      try {
        seriesRef.current.setData(uniqueData);
        chartRef.current?.timeScale().fitContent();
      } catch (err) {
        console.error("Error setting data on TradingViewChart:", err);
      }
    }
  }, [history]);

  return <div ref={containerRef} className="w-full h-full relative" />;
};
