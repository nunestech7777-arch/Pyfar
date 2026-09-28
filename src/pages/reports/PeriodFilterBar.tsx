import React, { useState } from 'react';
import { Calendar, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ReportsFilters, PeriodPreset, PERIOD_LABELS } from './reportsData';
import { PaymentMethod, PaymentStatus } from '../../types';
import { getPaymentMethodLabel, getPaymentStatusBadge } from '../../utils/formatters';

const PERIOD_OPTIONS: PeriodPreset[] = ['hoje', 'ontem', '7d', '30d', 'mes_atual', 'mes_anterior', 'personalizado'];
const STATUS_OPTIONS: PaymentStatus[] = ['pago', 'parcialmente_pago', 'pendente', 'atrasado'];
const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ['pix', 'dinheiro', 'transferencia', 'boleto', 'cheque', 'cartao'];

interface PeriodFilterBarProps {
  filters: ReportsFilters;
  onChange: (filters: ReportsFilters) => void;
}

export const PeriodFilterBar: React.FC<PeriodFilterBarProps> = ({ filters, onChange }) => {
  const { clients, commissioners, batches } = useApp();
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const productNames = Array.from(new Set(batches.map(b => b.vaccineName))).sort();

  const extraFilterCount = [
    filters.productName, filters.clientId, filters.batchId,
    filters.commissionerId, filters.paymentMethod, filters.status,
  ].filter(Boolean).length;

  const clearExtraFilters = () => {
    onChange({ period: filters.period, customStart: filters.customStart, customEnd: filters.customEnd });
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Period Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 flex-1">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p}
              onClick={() => onChange({ ...filters, period: p })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filters.period === p
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Mais Filtros */}
        <button
          onClick={() => setShowMoreFilters(v => !v)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap self-start ${
            extraFilterCount > 0
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-transparent'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Mais filtros</span>
          {extraFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {extraFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Custom Date Range */}
      {filters.period === 'personalizado' && (
        <div className="flex items-center gap-2 pt-1">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={filters.customStart || ''}
            onChange={(e) => onChange({ ...filters, customStart: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-400">até</span>
          <input
            type="date"
            value={filters.customEnd || ''}
            onChange={(e) => onChange({ ...filters, customEnd: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* More Filters Panel */}
      {showMoreFilters && (
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 animate-in fade-in duration-150">
          <select
            value={filters.productName || ''}
            onChange={(e) => onChange({ ...filters, productName: e.target.value || undefined })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Produto (todos)</option>
            {productNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <select
            value={filters.clientId || ''}
            onChange={(e) => onChange({ ...filters, clientId: e.target.value || undefined })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Cliente (todos)</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={filters.batchId || ''}
            onChange={(e) => onChange({ ...filters, batchId: e.target.value || undefined })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Lote (todos)</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.lotNumber} — {b.vaccineName}</option>)}
          </select>

          <select
            value={filters.commissionerId || ''}
            onChange={(e) => onChange({ ...filters, commissionerId: e.target.value || undefined })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Vendedor (todos)</option>
            {commissioners.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={filters.paymentMethod || ''}
            onChange={(e) => onChange({ ...filters, paymentMethod: (e.target.value || undefined) as PaymentMethod | undefined })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Pagamento (todos)</option>
            {PAYMENT_METHOD_OPTIONS.map(m => <option key={m} value={m}>{getPaymentMethodLabel(m)}</option>)}
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) => onChange({ ...filters, status: (e.target.value || undefined) as PaymentStatus | undefined })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Status (todos)</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getPaymentStatusBadge(s).label}</option>)}
          </select>

          {extraFilterCount > 0 && (
            <button
              onClick={clearExtraFilters}
              className="flex items-center justify-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-xl hover:bg-rose-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
