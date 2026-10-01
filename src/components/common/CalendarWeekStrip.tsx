import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { getChartRange, shiftChartAnchor, type ChartScope } from '../../utils/financeRules';

interface CalendarWeekStripProps {
  anchor: Date;
  scope: ChartScope;
  onChange: (anchor: Date, scope: ChartScope) => void;
}

const SCOPES: { id: ChartScope; label: string }[] = [
  { id: 'dia', label: 'Dia' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
];

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Filtro de atividade: o período escolhido aqui é o que alimenta o gráfico da dashboard.
export const CalendarWeekStrip: React.FC<CalendarWeekStripProps> = ({ anchor, scope, onChange }) => {
  const monday = getChartRange(anchor, 'semana').start;
  const daysInWeek = Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  const { start, end } = getChartRange(anchor, scope);

  const title = scope === 'ano' ? String(anchor.getFullYear()) : `${monthNames[anchor.getMonth()]} ${anchor.getFullYear()}`;
  const prevLabel = { dia: 'Dia anterior', semana: 'Semana anterior', mes: 'Mês anterior', ano: 'Ano anterior' }[scope];
  const nextLabel = { dia: 'Próximo dia', semana: 'Próxima semana', mes: 'Próximo mês', ano: 'Próximo ano' }[scope];

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Filtro de Atividade
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(shiftChartAnchor(anchor, scope, -1), scope)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            title={prevLabel}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChange(new Date(), 'dia')}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Hoje
          </button>
          <button
            onClick={() => onChange(shiftChartAnchor(anchor, scope, 1), scope)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            title={nextLabel}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-3">
        {SCOPES.map(sc => (
          <button
            key={sc.id}
            onClick={() => onChange(anchor, sc.id)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              scope === sc.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {sc.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
        {daysInWeek.map((date, idx) => {
          const isToday = new Date().toDateString() === date.toDateString();
          const inPeriod = date >= start && date <= end;
          const isSelected = scope === 'dia' && anchor.toDateString() === date.toDateString();

          return (
            <button
              key={idx}
              onClick={() => onChange(date, 'dia')}
              className={`
                flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition-all duration-200 group
                ${isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.03]'
                  : inPeriod
                    ? 'bg-blue-50 text-blue-800 border border-blue-200/80 hover:bg-blue-100/70'
                    : 'bg-slate-50/70 hover:bg-slate-100 text-slate-600'
                }
              `}
            >
              <span className={`text-[11px] font-medium tracking-wide uppercase ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                {weekDays[idx]}
              </span>
              <span className={`text-base sm:text-lg font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                {date.getDate()}
              </span>
              {isToday && !isSelected && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
