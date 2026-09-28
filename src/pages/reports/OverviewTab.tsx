import React from 'react';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { ChartAreaGradient } from '../../components/common/ChartAreaGradient';
import { DonutChart, DistributionBars } from '../../components/common/DonutChart';
import { ReportsTotals, ProductSummary, percentChange } from './reportsData';
import { Sale } from '../../types';

interface OverviewTabProps {
  totals: ReportsTotals;
  previousTotals: ReportsTotals;
  productSummaries: ProductSummary[];
  filteredSales: Sale[];
  onOpenCard: (type: 'sales_overview' | 'received_overview' | 'receivable_overview' | 'cost_overview' | 'profit_overview') => void;
  onOpenProduct: (product: ProductSummary) => void;
}

const ComparisonBadge: React.FC<{ current: number; previous: number }> = ({ current, previous }) => {
  const pct = percentChange(current, previous);
  if (pct === null) return null;
  const isUp = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{pct.toFixed(0)}% vs. período anterior
    </span>
  );
};

const MainCard: React.FC<{
  label: string;
  value: string;
  tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
  onClick: () => void;
  compare?: React.ReactNode;
}> = ({ label, value, tone, onClick, compare }) => {
  const toneMap: Record<string, string> = {
    blue: 'text-blue-700',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    slate: 'text-slate-900',
  };
  return (
    <button
      onClick={onClick}
      className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card text-left hover:border-blue-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase text-slate-400">{label}</span>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
      </div>
      <div className={`text-2xl sm:text-3xl font-black mt-1.5 ${toneMap[tone]}`}>{value}</div>
      {compare && <div className="mt-1.5">{compare}</div>}
    </button>
  );
};

export const OverviewTab: React.FC<OverviewTabProps> = ({ totals, previousTotals, productSummaries, filteredSales, onOpenCard, onOpenProduct }) => {
  // Buckets diários para o gráfico de vendas ao longo do tempo (máx. 30 pontos)
  const buckets: Record<string, { sales: number; profit: number }> = {};
  filteredSales.forEach(s => {
    const key = s.createdAt.split('T')[0];
    if (!buckets[key]) buckets[key] = { sales: 0, profit: 0 };
    buckets[key].sales += s.totalAmount;
    buckets[key].profit += s.grossProfit;
  });
  const sortedKeys = Object.keys(buckets).sort();
  const chartData = sortedKeys.length >= 2
    ? sortedKeys.map(k => ({
        label: `${k.split('-')[2]}/${k.split('-')[1]}`,
        sales: buckets[k].sales,
        profit: buckets[k].profit,
      }))
    : null;

  const topProducts = productSummaries.filter(p => p.revenue > 0 || p.currentStock > 0).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* 5 Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <MainCard
          label="Vendas"
          value={formatCurrency(totals.vendas)}
          tone="slate"
          onClick={() => onOpenCard('sales_overview')}
          compare={<ComparisonBadge current={totals.vendas} previous={previousTotals.vendas} />}
        />
        <MainCard
          label="Recebido"
          value={formatCurrency(totals.recebido)}
          tone="emerald"
          onClick={() => onOpenCard('received_overview')}
          compare={<ComparisonBadge current={totals.recebido} previous={previousTotals.recebido} />}
        />
        <MainCard
          label="A Receber"
          value={formatCurrency(totals.aReceber)}
          tone="amber"
          onClick={() => onOpenCard('receivable_overview')}
        />
        <MainCard
          label="Custo"
          value={formatCurrency(totals.custo)}
          tone="rose"
          onClick={() => onOpenCard('cost_overview')}
        />
        <MainCard
          label="Lucro"
          value={formatCurrency(totals.lucro)}
          tone="blue"
          onClick={() => onOpenCard('profit_overview')}
          compare={<ComparisonBadge current={totals.lucro} previous={previousTotals.lucro} />}
        />
      </div>

      {/* Resultado por Produto */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Resultado por Produto</h3>
        {topProducts.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-card text-center text-xs text-slate-400">
            Nenhum produto vendido no período selecionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {topProducts.map(p => (
              <button
                key={p.name}
                onClick={() => onOpenProduct(p)}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card text-left hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-slate-900 text-sm truncate">{p.name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 flex-shrink-0" />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div><span className="text-slate-400">Vendido</span><div className="font-bold text-slate-800">{p.unitsSold} un</div></div>
                  <div><span className="text-slate-400">Faturado</span><div className="font-bold text-slate-800">{formatCurrency(p.revenue)}</div></div>
                  <div><span className="text-slate-400">Lucro</span><div className="font-bold text-emerald-600">{formatCurrency(p.profit)}</div></div>
                  <div><span className="text-slate-400">A Receber</span><div className="font-bold text-amber-600">{formatCurrency(p.remaining)}</div></div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Gráficos (mínimos, só os que ajudam) */}
      {totals.vendas > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {chartData && <ChartAreaGradient data={chartData} title="Vendas ao Longo do Tempo" />}

          <DonutChart
            title="Recebido x A Receber"
            totalLabel="Total Vendido"
            totalValue={formatCurrency(totals.vendas).replace('R$', '').trim()}
            segments={[
              { label: 'Recebido', value: totals.recebido, color: '#059669', formattedValue: formatCurrency(totals.recebido) },
              { label: 'A Receber', value: totals.aReceber, color: '#d97706', formattedValue: formatCurrency(totals.aReceber) },
            ]}
          />

          {topProducts.some(p => p.profit > 0) && (
            <DistributionBars
              title="Lucro por Produto"
              items={topProducts
                .filter(p => p.profit > 0)
                .map(p => ({
                  name: p.name,
                  percentage: totals.lucro > 0 ? Math.round((p.profit / totals.lucro) * 100) : 0,
                  subtitle: formatCurrency(p.profit),
                  color: '#1d4ed8',
                }))}
            />
          )}
        </div>
      )}
    </div>
  );
};
