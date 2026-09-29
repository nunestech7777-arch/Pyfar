import React from 'react';
import { formatCurrency, formatDate, getSaleStatusBadge } from '../../utils/formatters';
import { Sale } from '../../types';

interface SalesTabProps {
  sales: Sale[];
  onOpenSale: (sale: Sale) => void;
}

export const SalesTab: React.FC<SalesTabProps> = ({ sales, onOpenSale }) => {
  if (sales.length === 0) {
    return (
      <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-card text-center text-sm text-slate-500">
        Nenhuma venda no período e filtros selecionados.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3.5">Data</th>
              <th className="p-3.5">Cliente</th>
              <th className="p-3.5">Produto</th>
              <th className="p-3.5 text-right">Valor da Venda</th>
              <th className="p-3.5 text-right">Lucro</th>
              <th className="p-3.5 text-right">Pago</th>
              <th className="p-3.5 text-right">Falta Receber</th>
              <th className="p-3.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map(sale => {
              const badge = getSaleStatusBadge(sale);
              const productLabel = Array.from(new Set(sale.items.map(i => i.vaccineName))).join(' + ');
              return (
                <tr key={sale.id} onClick={() => onOpenSale(sale)} className="hover:bg-slate-50/70 cursor-pointer transition-colors">
                  <td className="p-3.5 text-slate-500">{formatDate(sale.createdAt)}</td>
                  <td className="p-3.5 font-extrabold text-slate-900">{sale.clientName}</td>
                  <td className="p-3.5 text-slate-600 max-w-[180px] truncate">{productLabel}</td>
                  <td className="p-3.5 text-right font-black text-slate-900">{formatCurrency(sale.totalAmount)}</td>
                  <td className="p-3.5 text-right font-bold text-emerald-600">+{formatCurrency(sale.grossProfit)}</td>
                  <td className="p-3.5 text-right font-bold text-emerald-600">{formatCurrency(sale.paidAmount)}</td>
                  <td className="p-3.5 text-right font-bold text-rose-600">{formatCurrency(sale.remainingBalance)}</td>
                  <td className="p-3.5 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>{badge.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-slate-100">
        {sales.map(sale => {
          const badge = getSaleStatusBadge(sale);
          const productLabel = Array.from(new Set(sale.items.map(i => i.vaccineName))).join(' + ');
          return (
            <button key={sale.id} onClick={() => onOpenSale(sale)} className="w-full text-left p-4 space-y-2 active:bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 text-sm">{sale.clientName}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>{badge.label}</span>
              </div>
              <div className="text-[11px] text-slate-500">{productLabel} • {formatDate(sale.createdAt)}</div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div><span className="text-slate-400 block text-[10px]">Venda</span><strong>{formatCurrency(sale.totalAmount)}</strong></div>
                <div><span className="text-slate-400 block text-[10px]">Pago</span><strong className="text-emerald-600">{formatCurrency(sale.paidAmount)}</strong></div>
                <div><span className="text-slate-400 block text-[10px]">Falta</span><strong className="text-rose-600">{formatCurrency(sale.remainingBalance)}</strong></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
