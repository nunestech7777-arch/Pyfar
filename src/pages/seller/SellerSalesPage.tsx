import React, { useState } from 'react';
import { Search, PlusCircle } from 'lucide-react';
import { useSeller } from '../../context/SellerContext';
import { formatCurrency, formatDate, getPaymentMethodLabel, getSaleStatusBadge } from '../../utils/formatters';

// Só as vendas do próprio vendedor (filtradas no servidor), sem custo, lucro ou lote.
export const SellerSalesPage: React.FC = () => {
  const { data, setModule } = useSeller();
  const [search, setSearch] = useState('');
  if (!data) return null;

  const q = search.trim().toLowerCase();
  const sales = [...data.sales]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter(s => !q
      || s.clientName.toLowerCase().includes(q)
      || s.saleNumber.toLowerCase().includes(q)
      || s.items.some(i => i.vaccineName.toLowerCase().includes(q)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, produto ou número..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setModule('nova_venda')}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl"
        >
          <PlusCircle className="w-4 h-4" /> Nova venda
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {sales.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">Nenhuma venda encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left font-bold px-4 py-3">Data</th>
                  <th className="text-left font-bold px-4 py-3">Cliente</th>
                  <th className="text-left font-bold px-4 py-3">Produto</th>
                  <th className="text-right font-bold px-4 py-3">Vendido</th>
                  <th className="text-right font-bold px-4 py-3">Recebido</th>
                  <th className="text-right font-bold px-4 py-3">Pendente</th>
                  <th className="text-left font-bold px-4 py-3">Status</th>
                  <th className="text-left font-bold px-4 py-3">Vencimento</th>
                  <th className="text-left font-bold px-4 py-3">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map(sale => {
                  const badge = getSaleStatusBadge(sale);
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{formatDate(sale.createdAt)}</div>
                        <div className="text-[11px] text-slate-400">{sale.saleNumber}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{sale.clientName}</div>
                        {sale.storeName && <div className="text-[11px] text-slate-400">{sale.storeName}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {sale.items.map((it, i) => (
                          <div key={i} className="text-xs">{it.quantity} un. {it.vaccineName} × {formatCurrency(it.unitPrice)}</div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">{formatCurrency(sale.totalAmount)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 whitespace-nowrap">{formatCurrency(sale.paidAmount)}</td>
                      <td className="px-4 py-3 text-right text-amber-700 whitespace-nowrap">{formatCurrency(sale.remainingBalance)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">{formatDate(sale.dueDate)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">{getPaymentMethodLabel(sale.paymentMethod)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
