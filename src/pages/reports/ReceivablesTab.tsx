import React from 'react';
import { AlertTriangle, Clock, CalendarClock } from 'lucide-react';
import { formatCurrency, formatDate, getDaysOverdue, getSaleStatusBadge } from '../../utils/formatters';
import { Sale } from '../../types';
import { computeCurrentPosition, getDaysUntilDue } from '../../utils/financeRules';

interface ReceivablesTabProps {
  sales: Sale[]; // já filtradas pelas dimensões (cliente/produto/lote/vendedor/pagamento/status), NÃO pelo período
  onOpenSale: (sale: Sale) => void;
}

export const ReceivablesTab: React.FC<ReceivablesTabProps> = ({ sales, onOpenSale }) => {
  const { openSales: open, overdueSales: overdue, saldoAReceber: totalReceivable } = computeCurrentPosition(sales, []);
  const dueToday = open.filter(s => getDaysUntilDue(s.dueDate) === 0);
  const dueSoon = open.filter(s => { const d = getDaysUntilDue(s.dueDate); return d > 0 && d <= 7; });

  const sorted = [...open].sort((a, b) => getDaysOverdue(b.dueDate) - getDaysOverdue(a.dueDate));

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-400">Considera todas as vendas com saldo em aberto (não é filtrado pelo período selecionado acima).</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total a Receber</span>
          <div className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(totalReceivable)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-amber-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Vencendo Hoje</span>
          <div className="text-xl font-black text-amber-600 mt-0.5">{formatCurrency(dueToday.reduce((a, s) => a + s.remainingBalance, 0))}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-blue-600 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />Próximos 7 Dias</span>
          <div className="text-xl font-black text-blue-600 mt-0.5">{formatCurrency(dueSoon.reduce((a, s) => a + s.remainingBalance, 0))}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-rose-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Vencidos</span>
          <div className="text-xl font-black text-rose-600 mt-0.5">{formatCurrency(overdue.reduce((a, s) => a + s.remainingBalance, 0))}</div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-card text-center text-sm text-slate-500">
          Nenhum valor em aberto com os filtros selecionados. 🎉
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map(sale => {
            const badge = getSaleStatusBadge(sale);
            const overdueDays = getDaysOverdue(sale.dueDate);
            return (
              <button
                key={sale.id}
                onClick={() => onOpenSale(sale)}
                className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-card hover:border-amber-300 hover:shadow-md transition-all text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">{sale.clientName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>{badge.label}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Venda: {formatCurrency(sale.totalAmount)} • Pago: {formatCurrency(sale.paidAmount)} • Vencimento: {formatDate(sale.dueDate)}
                    {overdueDays > 0 && <span className="text-rose-600 font-bold"> ({overdueDays}d atraso)</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold">Falta</span>
                  <span className="text-lg font-black text-rose-600">{formatCurrency(sale.remainingBalance)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
