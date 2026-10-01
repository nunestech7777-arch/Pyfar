import React from 'react';
import { PlusCircle, Users, ShoppingCart, Package, TrendingUp, Receipt, Wallet, Clock } from 'lucide-react';
import { useSeller } from '../../context/SellerContext';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, getSaleStatusBadge } from '../../utils/formatters';
import { isSaleActive } from '../../utils/financeRules';

export const SellerHomePage: React.FC = () => {
  const { user } = useApp();
  const { data, setModule } = useSeller();
  if (!data) return null;

  const now = new Date();
  const activeSales = data.sales.filter(isSaleActive);
  const monthSales = activeSales.filter(s => {
    const d = new Date(s.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const soldThisMonth = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const received = activeSales.reduce((acc, s) => acc + s.paidAmount, 0);
  const pending = activeSales.reduce((acc, s) => acc + s.remainingBalance, 0);
  const recent = [...data.sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const cards = [
    { label: `Vendido em ${monthLabel}`, value: formatCurrency(soldThisMonth), icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    { label: 'Vendas no mês', value: String(monthSales.length), icon: Receipt, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Recebido (suas vendas)', value: formatCurrency(received), icon: Wallet, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Pendente a receber', value: formatCurrency(pending), icon: Clock, color: 'text-amber-600 bg-amber-50' },
  ];

  const shortcuts = [
    { id: 'nova_venda' as const, label: 'Nova venda', icon: PlusCircle, primary: true },
    { id: 'meus_clientes' as const, label: 'Meus clientes', icon: Users },
    { id: 'minhas_vendas' as const, label: 'Minhas vendas', icon: ShoppingCart },
    { id: 'produtos' as const, label: 'Produtos disponíveis', icon: Package },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Olá, {user.name}</h1>
        <p className="text-xs text-slate-500 mt-0.5">Resumo das suas vendas.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 mt-2">{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {shortcuts.map(sc => {
          const Icon = sc.icon;
          return (
            <button
              key={sc.id}
              onClick={() => setModule(sc.id)}
              className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all active:scale-[0.98] ${
                sc.primary
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-glow'
                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {sc.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Últimas vendas</h2>
          <button onClick={() => setModule('minhas_vendas')} className="text-xs font-semibold text-blue-600 hover:underline">
            Ver todas
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Você ainda não registrou vendas.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map(sale => {
              const badge = getSaleStatusBadge(sale);
              return (
                <div key={sale.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{sale.clientName}</div>
                    <div className="text-[11px] text-slate-500">{sale.saleNumber} • {formatDate(sale.createdAt)}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-slate-900">{formatCurrency(sale.totalAmount)}</div>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>{badge.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
