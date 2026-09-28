import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarWeekStripProps {
  onSelectDate?: (date: Date) => void;
}

export const CalendarWeekStrip: React.FC<CalendarWeekStripProps> = ({ onSelectDate }) => {
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + currentWeekOffset * 7);

  // Get days of current visible week
  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  
  // Calculate Monday of this week
  const currentDayOfWeek = baseDate.getDay(); // 0 is Sun, 1 is Mon...
  const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + distanceToMonday);

  const daysInWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const currentMonthName = monthNames[daysInWeek[3].getMonth()];
  const currentYear = daysInWeek[3].getFullYear();

  const handlePrevWeek = () => setCurrentWeekOffset(prev => prev - 1);
  const handleNextWeek = () => setCurrentWeekOffset(prev => prev + 1);

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            {currentMonthName} {currentYear}
          </h3>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Filtro de Atividade
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCurrentWeekOffset(0);
              setSelectedDayOffset(0);
              if (onSelectDate) onSelectDate(new Date());
            }}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Hoje
          </button>
          <button
            onClick={handleNextWeek}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            title="Próxima semana"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days Strip matching reference image */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
        {daysInWeek.map((date, idx) => {
          const dayNum = date.getDate();
          const dayName = weekDays[idx];
          const isToday = new Date().toDateString() === date.toDateString();
          const isSelected = selectedDayOffset === idx;

          return (
            <button
              key={idx}
              onClick={() => {
                setSelectedDayOffset(idx);
                if (onSelectDate) onSelectDate(date);
              }}
              className={`
                flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition-all duration-200 group
                ${isSelected 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.03]' 
                  : isToday
                    ? 'bg-blue-50 text-blue-800 border border-blue-200/80 hover:bg-blue-100/70'
                    : 'bg-slate-50/70 hover:bg-slate-100 text-slate-600'
                }
              `}
            >
              <span className={`text-[11px] font-medium tracking-wide uppercase ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                {dayName}
              </span>
              <span className={`text-base sm:text-lg font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                {dayNum}
              </span>
              {isToday && !isSelected && (
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
