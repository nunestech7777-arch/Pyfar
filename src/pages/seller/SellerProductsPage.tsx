import React, { useState } from 'react';
import { Search, PlusCircle } from 'lucide-react';
import { useSeller } from '../../context/SellerContext';
import { formatNumber } from '../../utils/formatters';

// Consulta de produtos para o vendedor: nome, fabricante e quantidade vendável (lotes com saldo e
// dentro da validade). Sem custo, fornecedor, lote ou histórico de compra — o servidor nem envia.
export const SellerProductsPage: React.FC = () => {
  const { data, setModule } = useSeller();
  const [search, setSearch] = useState('');
  if (!data) return null;

  const q = search.trim().toLowerCase();
  const products = data.products
    .filter(p => !q || p.name.toLowerCase().includes(q) || (p.manufacturer ?? '').toLowerCase().includes(q))
    .sort((a, b) => Number(b.available > 0) - Number(a.available > 0) || a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produto..."
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
        {products.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">Nenhum produto encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left font-bold px-4 py-3">Produto</th>
                  <th className="text-left font-bold px-4 py-3">Fabricante</th>
                  <th className="text-right font-bold px-4 py-3">Disponível</th>
                  <th className="text-left font-bold px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <tr key={p.name}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.manufacturer || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{formatNumber(p.available)} un.</td>
                    <td className="px-4 py-3">
                      {p.available > 0 ? (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">Disponível</span>
                      ) : (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200">Indisponível</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
