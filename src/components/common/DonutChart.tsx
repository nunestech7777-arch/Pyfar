import React from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  formattedValue?: string;
}

interface DonutChartProps {
  title?: string;
  totalLabel?: string;
  totalValue?: string | number;
  segments?: DonutSegment[];
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title = 'Top Vacinas Vendidas',
  totalLabel = 'Total Vendas',
  totalValue = '95K',
  segments = [
    { label: 'Hexavalente', value: 45, color: '#1d4ed8', formattedValue: '45%' },
    { label: 'Dengue Qdenga', value: 35, color: '#0f172a', formattedValue: '35%' },
    { label: 'Pneumocócica 13', value: 20, color: '#93c5fd', formattedValue: '20%' },
  ]
}) => {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  let cumulativePercent = 0;

  // SVG Coordinates
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
      </div>

      <div className="flex items-center justify-between gap-4 py-2">
        {/* Donut SVG with Central Label */}
        <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90 transform">
            {segments.map((seg, i) => {
              const percent = total > 0 ? (seg.value / total) : 0;
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativePercent * circumference;
              cumulativePercent += percent;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:opacity-90"
                />
              );
            })}
          </svg>

          {/* Central Pill Badge matching reference image */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
              {totalLabel}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900">
              {totalValue}
            </span>
          </div>
        </div>

        {/* Legend List matching reference image */}
        <div className="flex flex-col gap-2.5 flex-1 pl-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-slate-600 font-medium truncate">{seg.label}</span>
              </div>
              <span className="font-bold text-slate-800 ml-2">
                {seg.formattedValue || `${seg.value}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const DistributionBars: React.FC<{
  title?: string;
  items?: Array<{ name: string; percentage: number; color?: string; subtitle?: string }>;
}> = ({
  title = 'Principais Compradores',
  items = [
    { name: 'Clínica Vacinar & Vida (Paulo)', percentage: 45, color: '#1d4ed8', subtitle: 'R$ 76.000' },
    { name: 'Drogaria São Rafael (Fernanda)', percentage: 25, color: '#0f172a', subtitle: 'R$ 22.500' },
    { name: 'Centro Médico (Luiz)', percentage: 40, color: '#2563eb', subtitle: 'R$ 49.500' },
  ]
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card">
      <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-4">{title}</h3>

      <div className="space-y-3.5">
        {items.map((it, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-semibold truncate max-w-[200px]">{it.name}</span>
              <div className="flex items-center gap-2">
                {it.subtitle && <span className="text-slate-400 text-[11px]">{it.subtitle}</span>}
                <span className="font-bold text-slate-900">{it.percentage}%</span>
              </div>
            </div>

            {/* Progress Bar matching reference design */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${it.percentage}%`,
                  backgroundColor: it.color || '#1d4ed8'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
