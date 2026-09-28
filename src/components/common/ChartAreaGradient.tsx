import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

interface DataPoint {
  label: string;
  sales: number;
  profit: number;
}

interface ChartAreaGradientProps {
  data?: DataPoint[];
  title?: string;
}

export const ChartAreaGradient: React.FC<ChartAreaGradientProps> = ({ 
  data = [
    { label: 'Jan', sales: 42000, profit: 9500 },
    { label: 'Fev', sales: 38000, profit: 8200 },
    { label: 'Mar', sales: 56000, profit: 14000 },
    { label: 'Abr', sales: 49000, profit: 11200 },
    { label: 'Mai', sales: 88000, profit: 24500 },
    { label: 'Jun', sales: 72000, profit: 19800 },
    { label: 'Jul', sales: 95000, profit: 28000 },
    { label: 'Ago', sales: 110000, profit: 34000 },
    { label: 'Set', sales: 148000, profit: 46000 },
  ],
  title = 'Evolução de Vendas e Lucro'
}) => {
  const [metric, setMetric] = useState<'sales' | 'profit'>('sales');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const values = data.map(d => metric === 'sales' ? d.sales : d.profit);
  const maxVal = Math.max(...values, 1000) * 1.15;
  const minVal = 0;

  // SVG Chart Geometry
  const width = 600;
  const height = 220;
  const paddingX = 40;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, i) => {
    const val = metric === 'sales' ? d.sales : d.profit;
    const x = paddingX + (i / (data.length - 1)) * chartWidth;
    const y = height - paddingY - ((val - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, val, label: d.label, raw: d };
  });

  // Generate smooth cubic bezier SVG path
  const generateSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i !== pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const linePath = generateSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  // Find peak index
  const peakIdx = values.indexOf(Math.max(...values));
  const peakPoint = points[peakIdx];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
          <p className="text-xs text-slate-500">Histórico de faturamento do atacado</p>
        </div>

        {/* Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setMetric('sales')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              metric === 'sales'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Faturamento
          </button>
          <button
            onClick={() => setMetric('profit')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              metric === 'profit'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lucro Bruto
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full aspect-[2.4/1] min-h-[200px] mt-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            {/* Rich gradient matching reference image */}
            <linearGradient id="blueAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.05" />
            </linearGradient>

            <filter id="shadowGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#2563eb" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Grid horizontal lines */}
          {[0.2, 0.4, 0.6, 0.8, 1.0].map((pct, i) => {
            const y = height - paddingY - pct * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#94a3b8"
                  fontWeight="600"
                >
                  {metric === 'sales'
                    ? `${Math.round((maxVal * pct) / 1000)}k`
                    : `${Math.round((maxVal * pct) / 1000)}k`}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#blueAreaGradient)" />

          {/* Curved Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#1d4ed8"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#shadowGlow)"
          />

          {/* Peak badge just like in reference image */}
          {peakPoint && (
            <g transform={`translate(${peakPoint.x}, ${peakPoint.y - 12})`}>
              <rect
                x="-32"
                y="-18"
                width="64"
                height="20"
                rx="10"
                fill="#1e40af"
                className="shadow-sm"
              />
              <text
                x="0"
                y="-4"
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#ffffff"
              >
                +48.5%
              </text>
            </g>
          )}

          {/* Interactive Data Points */}
          {points.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={paddingY}
                    x2={pt.x}
                    y2={height - paddingY}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? "#1d4ed8" : "#ffffff"}
                  stroke="#1d4ed8"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150"
                />

                {/* X Axis label */}
                <text
                  x={pt.x}
                  y={height - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={isHovered ? '700' : '500'}
                  fill={isHovered ? '#1d4ed8' : '#64748b'}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip Overlay */}
        {hoveredIdx !== null && (
          <div
            className="absolute bg-slate-900 text-white text-xs px-3 py-1.5 rounded-xl shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all z-20"
            style={{
              left: `${(points[hoveredIdx].x / width) * 100}%`,
              top: `${(points[hoveredIdx].y / height) * 100 - 15}%`,
            }}
          >
            <div className="font-bold text-blue-300">{points[hoveredIdx].label} 2026</div>
            <div className="text-[11px] font-medium text-white">
              {metric === 'sales' ? 'Vendas: ' : 'Lucro: '}
              {formatCurrency(points[hoveredIdx].val)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
