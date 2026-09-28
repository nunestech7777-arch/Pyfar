import React, { useState } from 'react';
import { 
  Package, 
  CircleDollarSign, 
  TrendingUp, 
  ShoppingCart, 
  AlertTriangle, 
  Users, 
  Percent, 
  Calendar, 
  PlusCircle, 
  ArrowUpRight, 
  Receipt, 
  Clock, 
  ShieldAlert,
  ChevronRight,
  Landmark,
  PiggyBank
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { ChartAreaGradient } from '../components/common/ChartAreaGradient';
import { DonutChart, DistributionBars } from '../components/common/DonutChart';
import { CalendarWeekStrip } from '../components/common/CalendarWeekStrip';
import { formatCurrency, formatNumber, formatDate, getPaymentStatusBadge, isDateExpired, isDateNearExpiry } from '../utils/formatters';

export const DashboardPage: React.FC<{
  onOpenNewSale: () => void;
  onOpenNewBatch: () => void;
  onOpenNewExpense: () => void;
}> = ({ onOpenNewSale, onOpenNewBatch, onOpenNewExpense }) => {
  const { 
    sales, 
    batches, 
    clients, 
    commissions, 
    financialTransactions, 
    setCurrentModule, 
    setViewingReceiptSale 
  } = useApp();

  // Metrics Calculations
  // 1. Total em estoque (doses) e Valor total em estoque (R$)
  const totalStockUnits = batches.reduce((acc, b) => acc + b.currentQuantity, 0);
  const totalStockValue = batches.reduce((acc, b) => acc + (b.currentQuantity * b.unitCost), 0);

  // 2. Vendas e Lucros
  const totalSalesAmount = sales
    .filter(s => s.status !== 'cancelado')
    .reduce((acc, s) => acc + s.totalAmount, 0);

  const totalGrossProfit = sales
    .filter(s => s.status !== 'cancelado')
    .reduce((acc, s) => acc + s.grossProfit, 0);

  // 3. Contas a receber & Atrasado
  const totalReceivable = sales
    .filter(s => s.status !== 'cancelado' && s.remainingBalance > 0)
    .reduce((acc, s) => acc + s.remainingBalance, 0);

  const totalOverdue = sales
    .filter(s => s.status === 'atrasado' && s.remainingBalance > 0)
    .reduce((acc, s) => acc + s.remainingBalance, 0);

  // 4. Comissões pendentes
  const totalPendingCommissions = commissions
    .filter(c => c.status === 'liberada' || c.status === 'parcialmente_liberada' || c.status === 'pendente')
    .reduce((acc, c) => acc + (c.totalCommission - c.paidCommission), 0);

  const totalPaidCommissions = commissions
    .reduce((acc, c) => acc + c.paidCommission, 0);

  // 5. Total de despesas operacionais manuais
  const totalManualExpenses = financialTransactions
    .filter(f => f.type === 'saida' && !f.isAutomatic)
    .reduce((acc, f) => acc + f.amount, 0);

  // Lucro líquido estimado = lucro bruto - despesas operacionais - comissões pagas
  const estimatedNetProfit = totalGrossProfit - totalManualExpenses - totalPaidCommissions;

  // 6. Expiring & Expired lots
  const expiringLots = batches.filter(b => isDateNearExpiry(b.expirationDate) && b.currentQuantity > 0);
  const expiredLots = batches.filter(b => isDateExpired(b.expirationDate) && b.currentQuantity > 0);

  // Vaccine sales distribution for Donut chart
  const vaccineSalesMap: Record<string, number> = {};
  sales.forEach(s => {
    s.items.forEach(it => {
      vaccineSalesMap[it.vaccineName] = (vaccineSalesMap[it.vaccineName] || 0) + it.quantity;
    });
  });

  const donutColors = ['#1d4ed8', '#0f172a', '#3b82f6', '#93c5fd', '#64748b'];
  const topVaccinesList = Object.entries(vaccineSalesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const totalTopUnits = topVaccinesList.reduce((acc, curr) => acc + curr[1], 0);

  const donutSegments = topVaccinesList.map(([name, qty], idx) => ({
    label: name.split(' ')[0] + ' ' + (name.split(' ')[1] || ''),
    value: qty,
    color: donutColors[idx % donutColors.length],
    formattedValue: `${qty} un (${totalTopUnits > 0 ? Math.round((qty / totalTopUnits) * 100) : 0}%)`
  }));

  // Top Buying Clients for Distribution Bars
  const clientPurchasesMap: Record<string, { total: number; name: string }> = {};
  sales.forEach(s => {
    if (!clientPurchasesMap[s.clientId]) {
      clientPurchasesMap[s.clientId] = { total: 0, name: s.clientName };
    }
    clientPurchasesMap[s.clientId].total += s.totalAmount;
  });

  const topClientsList = Object.values(clientPurchasesMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  const maxClientTotal = topClientsList.length > 0 ? topClientsList[0].total : 1;
  const clientDistributionItems = topClientsList.map((c, idx) => ({
    name: c.name,
    percentage: Math.round((c.total / maxClientTotal) * 100),
    color: donutColors[idx % donutColors.length],
    subtitle: formatCurrency(c.total)
  }));

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* 1. Header Banner with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Visão Geral do Atacado
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
              ● Operação Ativa
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhamento de estoque, faturamento, recebíveis e lucro líquido em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenNewSale}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-blue-glow transition-all flex items-center gap-2 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Nova Venda</span>
          </button>

          <button
            onClick={onOpenNewBatch}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <Package className="w-4 h-4 text-blue-400" />
            <span>+ Entrada Estoque</span>
          </button>
        </div>
      </div>

      {/* 2. Critical Alerts Bar (if any overdue or expiring) */}
      {(totalOverdue > 0 || expiringLots.length > 0 || expiredLots.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {totalOverdue > 0 && (
            <div 
              onClick={() => setCurrentModule('contas_receber')}
              className="cursor-pointer bg-rose-50 hover:bg-rose-100/70 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 animate-bounce" />
                <div>
                  <span className="font-bold text-rose-900">Cobranças em Atraso:</span>{' '}
                  <span className="text-rose-700">{formatCurrency(totalOverdue)} a receber de clientes em atraso.</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400 flex-shrink-0" />
            </div>
          )}

          {(expiringLots.length > 0 || expiredLots.length > 0) && (
            <div 
              onClick={() => setCurrentModule('estoque')}
              className="cursor-pointer bg-amber-50 hover:bg-amber-100/70 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <span className="font-bold text-amber-900">Atenção ao Lote:</span>{' '}
                  <span className="text-amber-700">
                    {expiredLots.length > 0 ? `${expiredLots.length} lote(s) vencidos` : `${expiringLots.length} lote(s) próximos da validade`}.
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
            </div>
          )}
        </div>
      )}

      {/* 3. Main KPI Cards Row (matching the 3-cards row from the reference image, plus supporting KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total em Estoque */}
        <StatCard
          title="Total em Estoque"
          value={`${formatNumber(totalStockUnits)} un`}
          subtitle={`Valor Custo: ${formatCurrency(totalStockValue)}`}
          icon={Package}
          trend={{ value: '+14.2%', isPositive: true, label: 'vs mês ant.' }}
          onClick={() => setCurrentModule('estoque')}
        />

        {/* Vendas do Mês */}
        <StatCard
          title="Vendas Totais"
          value={formatCurrency(totalSalesAmount)}
          subtitle={`${sales.length} pedidos realizados`}
          icon={ShoppingCart}
          trend={{ value: '+28.4%', isPositive: true }}
          onClick={() => setCurrentModule('vendas')}
        />

        {/* Lucro Bruto */}
        <StatCard
          title="Lucro Bruto"
          value={formatCurrency(totalGrossProfit)}
          subtitle="Margem de saída sobre custo"
          icon={TrendingUp}
          trend={{ value: '+35.1%', isPositive: true }}
          onClick={() => setCurrentModule('financeiro')}
        />

        {/* Lucro Líquido Estimado (Highlighted in Electric Blue like the 3rd card in reference image!) */}
        <StatCard
          title="Lucro Líquido Estimado"
          value={formatCurrency(estimatedNetProfit)}
          subtitle="Lucro Bruto - Despesas - Comissões"
          icon={PiggyBank}
          variant="blue"
          trend={{ value: '+18.5%', isPositive: true }}
          onClick={() => setCurrentModule('financeiro')}
        />
      </div>

      {/* 4. Secondary Row: Receivables & Commissions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Valor a Receber (Fiado / Prazo) */}
        <div 
          onClick={() => setCurrentModule('contas_receber')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-semibold uppercase">
            <span>Valor a Receber (Prazo)</span>
            <CircleDollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(totalReceivable)}
          </div>
          <p className="text-[11px] text-blue-600 font-medium mt-1">
            {sales.filter(s => s.remainingBalance > 0).length} vendas com saldo em aberto →
          </p>
        </div>

        {/* Comissões Pendentes */}
        <div 
          onClick={() => setCurrentModule('mapa_comissoes')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-semibold uppercase">
            <span>Comissões Pendentes</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">
            {formatCurrency(totalPendingCommissions)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            {formatCurrency(totalPaidCommissions)} já pagas aos representantes →
          </p>
        </div>

        {/* Despesas Operacionais */}
        <div 
          onClick={() => setCurrentModule('financeiro')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-semibold uppercase">
            <span>Despesas Operacionais</span>
            <Landmark className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(totalManualExpenses)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Frete, galpão climatizado, energia, pró-labore →
          </p>
        </div>
      </div>

      {/* 5. Main Visual Dashboard Grid (Matching Reference Mockup Layout!) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Gradient Area Chart + Calendar Week Strip */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Area Chart */}
          <ChartAreaGradient />

          {/* Calendar Week Day Selector Strip from reference image */}
          <CalendarWeekStrip />
        </div>

        {/* Right Column (5 cols): Top Product Sale Donut + Traffic / Client Distribution */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Donut Chart matching reference "Top Product Sale" */}
          <DonutChart
            title="Vacinas Mais Vendidas"
            totalLabel="Quantidade Total"
            totalValue={`${totalTopUnits} un`}
            segments={donutSegments}
          />

          {/* Distribution Bars matching reference "Traffic Source" */}
          <DistributionBars
            title="Clientes com Maior Volume de Compra"
            items={clientDistributionItems}
          />
        </div>
      </div>

      {/* 6. Recent Sales Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Últimas Vendas Realizadas</h3>
            <p className="text-xs text-slate-500">Histórico recente de pedidos de lojistas e clínicas</p>
          </div>
          <button
            onClick={() => setCurrentModule('vendas')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Ver Todas as Vendas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3">Pedido</th>
                <th className="p-3">Cliente / Lojista</th>
                <th className="p-3">Itens</th>
                <th className="p-3 text-center">Quantidade Total</th>
                <th className="p-3 text-right">Valor Venda</th>
                <th className="p-3 text-right">Lucro Bruto</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.slice(0, 5).map((sale) => {
                const badge = getPaymentStatusBadge(sale.status);
                return (
                  <tr key={sale.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-600">{sale.saleNumber}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{sale.clientName}</div>
                      {sale.storeName && (
                        <div className="text-[11px] text-slate-500">{sale.storeName}</div>
                      )}
                    </td>
                    <td className="p-3 text-slate-700 max-w-[200px] truncate">
                      {sale.items.map(it => `${it.quantity}x ${it.vaccineName}`).join(', ')}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">{sale.totalQuantity}</td>
                    <td className="p-3 text-right font-black text-slate-900">{formatCurrency(sale.totalAmount)}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">+{formatCurrency(sale.grossProfit)}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setViewingReceiptSale(sale)}
                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-colors"
                        title="Ver Comprovante"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
