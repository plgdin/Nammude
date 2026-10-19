import React, { useState } from 'react';
import { formatCurrency } from '@/lib/currency';

interface DayData {
  day: string;
  date: string;
  netSales: number;
  orderCount: number;
}

interface SalesTrendChartProps {
  data: DayData[];
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxSales = Math.max(...data.map((d) => d.netSales));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400">7-Day Net Sales Velocity</p>
          <p className="text-lg font-bold text-white">
            {formatCurrency(data.reduce((acc, curr) => acc + curr.netSales, 0))}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand" />
            Net Sales
          </span>
        </div>
      </div>

      {/* SVG Interactive Bar Chart */}
      <div className="relative pt-6">
        {/* Tooltip Overlay */}
        {hoveredIndex !== null && (
          <div
            className="absolute top-0 z-10 -translate-x-1/2 rounded-md border border-surface-border bg-surface-elevated px-2.5 py-1 text-[11px] text-white shadow-lg pointer-events-none transition-all"
            style={{
              left: `${((hoveredIndex + 0.5) / data.length) * 100}%`,
            }}
          >
            <p className="font-semibold text-brand-fg">
              {data[hoveredIndex].date}: {formatCurrency(data[hoveredIndex].netSales)}
            </p>
            <p className="text-gray-400">{data[hoveredIndex].orderCount} orders completed</p>
          </div>
        )}

        {/* Chart Grid & Bars */}
        <div className="flex items-end justify-between gap-1 sm:gap-2 h-40 border-b border-surface-border pb-2">
          {data.map((item, index) => {
            const heightPercent = (item.netSales / maxSales) * 100;
            const isHovered = hoveredIndex === index;
            const isToday = item.day === 'Today';

            return (
              <div
                key={item.day}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="w-full flex items-end justify-center h-full">
                  <div
                    className={`w-full max-w-[32px] rounded-t-md transition-all duration-200 ${
                      isToday
                        ? 'bg-brand'
                        : isHovered
                        ? 'bg-blue-400'
                        : 'bg-surface-active group-hover:bg-blue-500/60'
                    }`}
                    style={{ height: `${Math.max(heightPercent, 8)}%` }}
                  />
                </div>
                <div className="mt-2 text-center">
                  <span
                    className={`text-[11px] font-medium block ${
                      isToday ? 'text-brand font-bold' : 'text-gray-400'
                    }`}
                  >
                    {item.day}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
