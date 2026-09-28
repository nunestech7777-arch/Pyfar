import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
    label?: string;
  };
  variant?: 'white' | 'blue' | 'accent' | 'warning' | 'danger';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'white',
  onClick,
}) => {
  const isClickable = !!onClick;

  if (variant === 'blue') {
    return (
      <div
        onClick={onClick}
        className={`bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-5 shadow-blue-glow transition-all ${
          isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99]' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">{title}</span>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
          {value}
        </div>
        {trend && (
          <div className="flex items-center gap-1.5 text-xs text-blue-100 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{trend.value} {trend.label || 'Desde o mês passado'}</span>
          </div>
        )}
        {subtitle && !trend && (
          <p className="text-xs text-blue-200 mt-1">{subtitle}</p>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-200 ${
        isClickable ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 flex-shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
            trend.isNeutral
              ? 'bg-slate-100 text-slate-600'
              : trend.isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
          }`}>
            {trend.isNeutral ? (
              <Minus className="w-3 h-3" />
            ) : trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{trend.value}</span>
          </div>
        )}
      </div>

      <div className="mt-1">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          {title}
        </h4>
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {value}
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
