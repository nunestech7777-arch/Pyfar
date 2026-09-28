import React from 'react';
import { ChevronRight, Package } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { ProductSummary } from './reportsData';

interface ProductsTabProps {
  productSummaries: ProductSummary[];
  onOpenProduct: (product: ProductSummary) => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({ productSummaries, onOpenProduct }) => {
  const products = productSummaries.filter(p => p.currentStock > 0 || p.unitsSold > 0 || p.salesCount > 0);

  if (products.length === 0) {
    return (
      <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-card text-center space-y-2">
        <Package className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-sm text-slate-500">Nenhum produto cadastrado ou vendido no período selecionado.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {products.map(p => {
        const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
        return (
          <button
            key={p.name}
            onClick={() => onOpenProduct(p)}
            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card text-left hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-black text-slate-900 text-base truncate">{p.name}</span>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 flex-shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
              <div>
                <span className="text-slate-400 block">Vendido</span>
                <span className="font-bold text-slate-800">{p.unitsSold} un</span>
              </div>
              <div>
                <span className="text-slate-400 block">Estoque Atual</span>
                <span className="font-bold text-slate-800">{p.currentStock} un</span>
              </div>
              <div>
                <span className="text-slate-400 block">Faturamento</span>
                <span className="font-bold text-slate-800">{formatCurrency(p.revenue)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Lucro</span>
                <span className="font-bold text-emerald-600">{formatCurrency(p.profit)} <span className="text-[10px] text-slate-400">({margin.toFixed(0)}%)</span></span>
              </div>
              <div>
                <span className="text-slate-400 block">Recebido</span>
                <span className="font-bold text-emerald-600">{formatCurrency(p.paid)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">A Receber</span>
                <span className="font-bold text-amber-600">{formatCurrency(p.remaining)}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
