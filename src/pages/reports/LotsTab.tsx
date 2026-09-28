import React from 'react';
import { ChevronRight, Layers } from 'lucide-react';
import { formatCurrency, formatDate, isDateExpired } from '../../utils/formatters';
import { LotSummary } from './reportsData';

interface LotsTabProps {
  lotSummaries: LotSummary[];
  onOpenLot: (lot: LotSummary) => void;
}

export const LotsTab: React.FC<LotsTabProps> = ({ lotSummaries, onOpenLot }) => {
  if (lotSummaries.length === 0) {
    return (
      <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-card text-center space-y-2">
        <Layers className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-sm text-slate-500">Nenhum lote cadastrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {lotSummaries.map(l => {
        const b = l.batch;
        const invested = b.initialQuantity * b.unitCost;
        const expired = isDateExpired(b.expirationDate);

        return (
          <button
            key={b.id}
            onClick={() => onOpenLot(l)}
            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card text-left hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-black text-slate-900 text-sm truncate">{b.vaccineName}</span>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">{b.lotNumber}</span>
              {expired && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">Vencido</span>}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
              <div><span className="text-slate-400 block">Comprado</span><span className="font-bold text-slate-800">{b.initialQuantity} un</span></div>
              <div><span className="text-slate-400 block">Restante</span><span className="font-bold text-slate-800">{b.currentQuantity} un</span></div>
              <div><span className="text-slate-400 block">Investimento</span><span className="font-bold text-slate-800">{formatCurrency(invested)}</span></div>
              <div><span className="text-slate-400 block">Lucro</span><span className="font-bold text-emerald-600">{formatCurrency(l.profit)}</span></div>
              <div><span className="text-slate-400 block">Recebido</span><span className="font-bold text-emerald-600">{formatCurrency(l.paid)}</span></div>
              <div><span className="text-slate-400 block">A Receber</span><span className="font-bold text-amber-600">{formatCurrency(l.remaining)}</span></div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
              Validade: {formatDate(b.expirationDate)}
            </div>
          </button>
        );
      })}
    </div>
  );
};
