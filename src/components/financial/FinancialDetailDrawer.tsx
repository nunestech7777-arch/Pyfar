import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowLeft, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  Package, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Building2, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Sparkles,
  Phone,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  Layers,
  PieChart
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  formatCurrency, 
  formatDate, 
  getDaysOverdue, 
  getSaleStatusBadge, 
  getCommissionStatusBadge, 
  getPaymentMethodLabel 
} from '../../utils/formatters';
import { Sale, VaccineBatch, CommissionEntry, FinancialTransaction, Client } from '../../types';
import { computePeriodResult, computeCurrentPosition, isSaleOverdue, isCommissionPending } from '../../utils/financeRules';

export type FinancialDrawerType = 
  | 'revenue'               // 1. Total Faturado
  | 'gross_profit'          // 2. Lucro Bruto
  | 'expenses_commissions'  // 3. Despesas + Comissões
  | 'net_profit'            // 4. Lucro Líquido Estimado
  | 'stock_purchased'       // Estoque Comprado
  | 'receivables'           // Saldo a Receber (Prazo)
  | 'overdue'               // Em Atraso (Vencido)
  | 'pending_commissions'   // Comissões Pendentes
  | 'sale_detail'           // Detalhe Completo de Venda
  | 'expense_detail';       // Detalhe de Despesa

export interface DrawerHistoryItem {
  type: FinancialDrawerType;
  title: string;
  data?: any;
}

interface FinancialDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: FinancialDrawerType;
  onOpenRecordPayment?: (sale: Sale) => void;
  onOpenReceipt?: (sale: Sale) => void;
  // Período do "Resultado do Período" do card; os tipos de Posição Atual ignoram.
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
}

export const FinancialDetailDrawer: React.FC<FinancialDetailDrawerProps> = ({
  isOpen,
  onClose,
  initialType,
  onOpenRecordPayment,
  onOpenReceipt,
  periodStart,
  periodEnd,
  periodLabel,
}) => {
  const { sales, batches, commissions, financialTransactions, clients } = useApp();

  // Navigation History Stack for Hierarchical Drill-Down
  const [history, setHistory] = useState<DrawerHistoryItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [tabFilter, setTabFilter] = useState<string>('todas');

  // Reset or initialize stack when opening or initialType changes
  React.useEffect(() => {
    if (isOpen) {
      const getInitialTitle = (t: FinancialDrawerType) => {
        switch (t) {
          case 'revenue': return `Faturamento — ${periodLabel}`;
          case 'gross_profit': return `Lucro Bruto — ${periodLabel}`;
          case 'expenses_commissions': return `Despesas e Comissões — ${periodLabel}`;
          case 'net_profit': return `Lucro Líquido — ${periodLabel}`;
          case 'stock_purchased': return `Compras de Estoque — ${periodLabel}`;
          case 'receivables': return 'Saldo a Receber (Prazo)';
          case 'overdue': return 'Títulos e Vendas em Atraso';
          case 'pending_commissions': return 'Comissões Pendentes e Liberadas';
          default: return 'Detalhamento Financeiro';
        }
      };
      setHistory([{ type: initialType, title: getInitialTitle(initialType) }]);
      setSearchFilter('');
      setTabFilter('todas');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialType]);

  if (!isOpen || history.length === 0) return null;

  const currentStep = history[history.length - 1];

  const pushStep = (item: DrawerHistoryItem) => {
    setHistory(prev => [...prev, item]);
    setSearchFilter('');
    setTabFilter('todas');
  };

  const popStep = () => {
    if (history.length > 1) {
      setHistory(prev => prev.slice(0, -1));
      setSearchFilter('');
      setTabFilter('todas');
    }
  };

  // -------------------------------------------------------------
  // Mesmas regras do card (utils/financeRules.ts) para o detalhe sempre somar o valor exibido.
  // Resultado do Período: filtrado por periodStart/periodEnd. Posição Atual: fotografia de hoje.
  // -------------------------------------------------------------
  const periodResult = computePeriodResult(sales, financialTransactions, periodStart, periodEnd);
  const currentPosition = computeCurrentPosition(sales, commissions);

  const activeSales = periodResult.sales;
  const totalSold = periodResult.vendas;
  const totalCostOfGoodsSold = periodResult.custo;
  const grossProfit = periodResult.lucroBruto;
  const overallMargin = periodResult.margem;
  const totalReceived = periodResult.recebido;

  const openSales = currentPosition.openSales;
  const totalReceivable = currentPosition.saldoAReceber;
  const totalOverdue = currentPosition.emAtraso;

  const stockPurchaseList = periodResult.stockPurchases;
  const totalStockPurchased = periodResult.comprasEstoque;

  const operatingExpensesList = periodResult.expenses;
  const totalOperatingExpenses = periodResult.despesas;

  const totalCommissionsPaid = periodResult.comissoes;
  const commissionPaidInPeriod = (commissionId: string) =>
    periodResult.commissionPayments.filter(tx => tx.referenceId === commissionId).reduce((acc, tx) => acc + tx.amount, 0);
  const commissionsPaidInPeriod = commissions.filter(c => commissionPaidInPeriod(c.id) > 0);
  const totalCommissionsPending = currentPosition.comissoesPendentes;

  const estimatedNetProfit = periodResult.lucroLiquido;
  const netMargin = totalSold > 0 ? (estimatedNetProfit / totalSold) * 100 : 0;

  const overdueSalesList = currentPosition.overdueSales
    .map(s => ({
      ...s,
      daysOverdue: getDaysOverdue(s.dueDate),
      client: clients.find(c => c.id === s.clientId)
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // -------------------------------------------------------------
  // RENDER DRAWER CONTENT
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition ease-in-out duration-300">
          
          {/* Header */}
          <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {history.length > 1 ? (
                  <button
                    onClick={popStep}
                    className="p-1.5 -ml-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-1 text-xs font-bold active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                )}
                
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <span>Auditável • DRE Atacado</span>
                    {history.length > 1 && (
                      <span className="text-slate-400">• Nível {history.length}</span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {currentStep.title}
                  </h2>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Fechar (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Breadcrumbs if deep */}
            {history.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-400 pb-1 scrollbar-none">
                {history.map((step, idx) => (
                  <React.Fragment key={idx}>
                    <button
                      onClick={() => {
                        setHistory(prev => prev.slice(0, idx + 1));
                        setSearchFilter('');
                      }}
                      className={`hover:underline whitespace-nowrap ${
                        idx === history.length - 1 ? 'text-blue-300 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {step.title.split(' ')[0]} {step.title.split(' ')[1] || ''}
                    </button>
                    {idx < history.length - 1 && <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Drawer Body Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
            
            {/* ========================================================================= */}
            {/* 1. REVENUE (TOTAL FATURADO)                                               */}
            {/* ========================================================================= */}
            {currentStep.type === 'revenue' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Top Summary Cards (Harmonious 2x2 Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Faturado</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                        100% auditado
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight my-1.5">
                      {formatCurrency(totalSold)}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">Vendas de {periodLabel}</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Já Recebido</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                        Em caixa
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight my-1.5">
                      {formatCurrency(totalReceived)}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">Recebido até hoje dessas vendas</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Saldo a Receber</span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                        Prazo
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight my-1.5">
                      {formatCurrency(periodResult.aReceber)}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">A receber dessas vendas</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Volume de Vendas</span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/70">
                        {activeSales.length} pedidos
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight my-1.5">
                      {activeSales.reduce((acc, s) => acc + s.totalQuantity, 0)} <span className="text-sm font-bold text-slate-400">unidades</span>
                    </div>
                    <span className="text-[11px] text-blue-600 font-semibold">Total de unidades faturadas</span>
                  </div>
                </div>

                {/* Audit Reconciliation Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
                  <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="font-bold">Reconciliação Financeira:</strong> A soma dos {activeSales.length} pedidos abaixo totaliza exatamente <strong className="font-black text-blue-950">{formatCurrency(totalSold)}</strong>. Clique em qualquer venda para inspecionar itens, custos e lucros.
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Buscar por cliente, código da venda..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>

                {/* Sales List */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Lista de Vendas do Faturamento</span>
                    <span className="text-[10px] text-slate-400 font-normal">Clique para ver itens</span>
                  </div>

                  {activeSales
                    .filter(s => 
                      s.clientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      s.saleNumber.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map(sale => {
                      const badge = getSaleStatusBadge(sale);
                      return (
                        <div
                          key={sale.id}
                          onClick={() => pushStep({
                            type: 'sale_detail',
                            title: `Venda ${sale.saleNumber}`,
                            data: sale
                          })}
                          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-600 text-xs">{sale.saleNumber}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-black text-slate-900 text-sm">{sale.clientName}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                                {badge.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-3">
                              <span>Data: {formatDate(sale.createdAt)}</span>
                              <span>Qtd: <strong>{sale.totalQuantity} un</strong></span>
                              <span>Pagamento: {getPaymentMethodLabel(sale.paymentMethod)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                            <div className="text-right">
                              <div className="text-xs text-slate-400 font-medium">Valor Total</div>
                              <div className="text-sm font-black text-slate-900">{formatCurrency(sale.totalAmount)}</div>
                              <div className="text-[10px] text-emerald-600 font-bold">
                                Rec: {formatCurrency(sale.paidAmount)}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. GROSS PROFIT (LUCRO BRUTO)                                             */}
            {/* ========================================================================= */}
            {currentStep.type === 'gross_profit' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* DRE Formula Breakdown Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-700 shadow-md space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Fórmula de Lucro Bruto
                  </span>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                      <span className="text-[10px] text-slate-400 block">Total Vendas</span>
                      <strong className="text-sm sm:text-base font-black text-white">{formatCurrency(totalSold)}</strong>
                    </div>

                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                      <span className="text-[10px] text-rose-300 block">(-) CMV (Custo)</span>
                      <strong className="text-sm sm:text-base font-black text-rose-400">-{formatCurrency(totalCostOfGoodsSold)}</strong>
                    </div>

                    <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-500/40">
                      <span className="text-[10px] text-emerald-300 block">(=) Lucro Bruto</span>
                      <strong className="text-sm sm:text-base font-black text-emerald-400">{formatCurrency(grossProfit)}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                    <span className="text-slate-300">Margem Bruta Média Geral:</span>
                    <span className="font-black text-emerald-400 text-sm bg-emerald-900/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                      {overallMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Buscar venda ou cliente para auditar margem..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>

                {/* Breakdown List */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Composição por Venda Realizada</span>
                    <span className="text-[10px] text-slate-400 font-normal">Receita - Custo = Lucro</span>
                  </div>

                  {activeSales
                    .filter(s => 
                      s.clientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      s.saleNumber.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map(sale => {
                      const saleMargin = sale.totalAmount > 0 ? (sale.grossProfit / sale.totalAmount) * 100 : 0;
                      return (
                        <div
                          key={sale.id}
                          onClick={() => pushStep({
                            type: 'sale_detail',
                            title: `Composição: ${sale.saleNumber}`,
                            data: sale
                          })}
                          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-600 text-xs">{sale.saleNumber}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-extrabold text-slate-900 text-sm">{sale.clientName}</span>
                            </div>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black px-2.5 py-0.5 rounded-full">
                              Margem: {saleMargin.toFixed(1)}%
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Receita Venda</span>
                              <span className="font-bold text-slate-900">{formatCurrency(sale.totalAmount)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Custo da Mercadoria</span>
                              <span className="font-bold text-rose-600">-{formatCurrency(sale.totalCost)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-semibold">Lucro Bruto</span>
                              <span className="font-black text-emerald-600">+{formatCurrency(sale.grossProfit)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. EXPENSES & COMMISSIONS (DESPESAS + COMISSÕES)                          */}
            {/* ========================================================================= */}
            {currentStep.type === 'expenses_commissions' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Despesas Operacionais</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{formatCurrency(totalOperatingExpenses)}</div>
                    <span className="text-[10px] text-slate-400">{operatingExpensesList.length} lançamentos</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] font-bold text-blue-600 uppercase block">Comissões Pagas</span>
                    <div className="text-lg font-black text-blue-700 mt-0.5">{formatCurrency(totalCommissionsPaid)}</div>
                    <span className="text-[10px] text-slate-400">Repasses efetuados</span>
                  </div>

                  <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-rose-700 uppercase block">Total Geral Deduções</span>
                    <div className="text-lg font-black text-rose-700 mt-0.5">
                      {formatCurrency(totalOperatingExpenses + totalCommissionsPaid)}
                    </div>
                    <span className="text-[10px] text-rose-600 font-bold">100% na DRE</span>
                  </div>
                </div>

                {/* Subtabs [Todas, Despesas, Comissões] */}
                <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                  {[
                    { id: 'todas', label: 'Todas as Saídas' },
                    { id: 'despesas', label: `Despesas (${operatingExpensesList.length})` },
                    { id: 'comissoes', label: `Comissões (${commissionsPaidInPeriod.length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setTabFilter(tab.id)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        tabFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar por descrição, categoria ou representante..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>

                {/* List Container */}
                <div className="space-y-2.5">
                  {/* Despesas list */}
                  {(tabFilter === 'todas' || tabFilter === 'despesas') && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Despesas Operacionais Manuais
                      </span>
                      {operatingExpensesList
                        .filter(e => 
                          e.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          e.categoryLabel.toLowerCase().includes(searchFilter.toLowerCase())
                        )
                        .map(exp => (
                          <div
                            key={exp.id}
                            onClick={() => pushStep({
                              type: 'expense_detail',
                              title: `Despesa: ${exp.categoryLabel}`,
                              data: exp
                            })}
                            className="bg-white p-3.5 rounded-2xl border border-slate-200/80 hover:border-rose-400 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  {exp.categoryLabel}
                                </span>
                                <span className="text-xs font-bold text-slate-900">{exp.description}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block">{formatDate(exp.date)}</span>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <span className="font-black text-sm text-slate-900">-{formatCurrency(exp.amount)}</span>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Comissões list */}
                  {(tabFilter === 'todas' || tabFilter === 'comissoes') && (
                    <div className="space-y-2 pt-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Comissões pagas no período
                      </span>
                      {commissionsPaidInPeriod
                        .filter(c => 
                          c.commissionerName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          c.clientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          c.saleNumber.toLowerCase().includes(searchFilter.toLowerCase())
                        )
                        .map(comm => {
                          const linkedSale = sales.find(s => s.id === comm.saleId || s.saleNumber === comm.saleNumber);
                          const badge = getCommissionStatusBadge(comm.status);

                          return (
                            <div
                              key={comm.id}
                              onClick={() => {
                                if (linkedSale) {
                                  pushStep({
                                    type: 'sale_detail',
                                    title: `Venda Vinculada: ${comm.saleNumber}`,
                                    data: linkedSale
                                  });
                                }
                              }}
                              className="bg-white p-3.5 rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-900 text-xs">{comm.commissionerName}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono text-blue-600 text-xs font-bold">{comm.saleNumber}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                                    {badge.label}
                                  </span>
                                </div>
                                <span className="text-xs font-black text-slate-900">
                                  Total: {formatCurrency(comm.totalCommission)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <span>Cliente: <strong>{comm.clientName}</strong></span>
                                <span>Paga no período: <strong className="text-emerald-600">{formatCurrency(commissionPaidInPeriod(comm.id))}</strong></span>
                                <span className="text-blue-600 font-bold flex items-center gap-0.5">
                                  Ver Venda <ChevronRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. NET PROFIT (LUCRO LÍQUIDO ESTIMADO)                                    */}
            {/* ========================================================================= */}
            {currentStep.type === 'net_profit' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Hero Waterfall Breakdown */}
                <div className="bg-gradient-to-br from-[#071330] via-slate-900 to-blue-950 text-white p-6 rounded-3xl border border-blue-500/30 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                        Estrutura do DRE Completo
                      </span>
                      <h3 className="text-lg font-black text-white">Cascata de Lucro Líquido</h3>
                    </div>
                    <span className="bg-blue-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-sm">
                      Margem Líquida: {netMargin.toFixed(1)}%
                    </span>
                  </div>

                  {/* Interactive Lines */}
                  <div className="space-y-2 text-xs">
                    
                    {/* Line 1: Faturado */}
                    <div 
                      onClick={() => pushStep({ type: 'revenue', title: `Faturamento — ${periodLabel}` })}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-[10px]">+</span>
                        <span className="font-bold text-slate-200">TOTAL FATURADO (Receita Bruta)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{formatCurrency(totalSold)}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Line 2: CMV */}
                    <div 
                      onClick={() => pushStep({ type: 'gross_profit', title: `Lucro Bruto — ${periodLabel}` })}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-[10px]">-</span>
                        <span className="font-bold text-rose-300">(-) Custo das Mercadorias Vendidas (CMV)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-rose-300">-{formatCurrency(totalCostOfGoodsSold)}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Line 3: Lucro Bruto */}
                    <div 
                      onClick={() => pushStep({ type: 'gross_profit', title: `Lucro Bruto — ${periodLabel}` })}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 transition-colors cursor-pointer border border-emerald-500/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[10px]">=</span>
                        <span className="font-extrabold text-emerald-300">(=) LUCRO BRUTO</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-emerald-400">{formatCurrency(grossProfit)}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    </div>

                    {/* Line 4: Despesas Operacionais */}
                    <div 
                      onClick={() => pushStep({ type: 'expenses_commissions', title: `Despesas — ${periodLabel}` })}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px]">-</span>
                        <span className="font-bold text-amber-200">(-) Despesas Operacionais</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-amber-300">-{formatCurrency(totalOperatingExpenses)}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Line 5: Comissoes */}
                    <div 
                      onClick={() => pushStep({ type: 'expenses_commissions', title: `Comissões — ${periodLabel}` })}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-[10px]">-</span>
                        <span className="font-bold text-blue-200">(-) Comissões Pagas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-blue-300">-{formatCurrency(totalCommissionsPaid)}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Line 6: Lucro Líquido Final */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-600 text-white font-black shadow-lg border border-blue-400/50 mt-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-200" />
                        <span className="text-sm uppercase tracking-wide">(=) LUCRO LÍQUIDO ESTIMADO</span>
                      </div>
                      <span className="text-xl font-black">{formatCurrency(estimatedNetProfit)}</span>
                    </div>
                  </div>
                </div>

                {/* Audit Explanation */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Transparência e Rastreabilidade Total</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Cada linha da cascata é clicável e direciona para a lista auditável correspondente. Nenhuma dedução ou receita foi estimada ou gerada com valores fictícios.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 5. STOCK PURCHASED (ESTOQUE COMPRADO)                                     */}
            {/* ========================================================================= */}
            {currentStep.type === 'stock_purchased' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Compras no Período</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{formatCurrency(totalStockPurchased)}</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">Saídas "Compra de Estoque"</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Lançamentos</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{stockPurchaseList.length}</div>
                    <span className="text-[10px] text-slate-400">Entradas de lote no período</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900">
                  Isto é o que saiu do caixa para comprar estoque no período, pela data da entrada do lote. Não é o valor do estoque atual, e não reduz o lucro: o custo entra no lucro quando o produto é vendido.
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Buscar lote, produto, fornecedor..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>

                <div className="space-y-2.5">
                  {stockPurchaseList.length === 0 && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                      Nenhuma compra de estoque neste período.
                    </div>
                  )}
                  {stockPurchaseList
                    .map(tx => ({ tx, batch: batches.find(b => b.id === tx.referenceId) }))
                    .filter(({ tx, batch }) => {
                      const q = searchFilter.toLowerCase();
                      return tx.description.toLowerCase().includes(q) ||
                        (batch?.vaccineName.toLowerCase().includes(q) ?? false) ||
                        (batch?.lotNumber.toLowerCase().includes(q) ?? false) ||
                        (batch?.supplier?.toLowerCase().includes(q) ?? false);
                    })
                    .map(({ tx, batch }) => (
                      <div key={tx.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 text-sm">
                              {batch ? `${batch.vaccineName} — Lote ${batch.lotNumber}` : tx.description}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Data: <strong>{formatDate(tx.date)}</strong>
                              {batch?.supplier && <> • Fornecedor: <strong>{batch.supplier}</strong></>}
                              {!batch && <> • <span className="text-amber-600 font-semibold">lote excluído do estoque</span></>}
                            </div>
                          </div>
                          <span className="text-sm font-black text-slate-900 whitespace-nowrap">{formatCurrency(tx.amount)}</span>
                        </div>
                        {batch && (
                          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-100">
                            <div><span className="text-[10px] text-slate-400 block">Qtd. Comprada</span><strong className="text-slate-800">{batch.initialQuantity} un</strong></div>
                            <div><span className="text-[10px] text-slate-400 block">Saldo Atual</span><strong className="text-blue-600">{batch.currentQuantity} un</strong></div>
                            <div className="text-right"><span className="text-[10px] text-slate-400 block">Custo Unitário</span><strong className="text-slate-800">{formatCurrency(batch.unitCost)}</strong></div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 6. RECEIVABLES (SALDO A RECEBER - PRAZO)                                  */}
            {/* ========================================================================= */}
            {currentStep.type === 'receivables' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Top Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] font-bold text-amber-600 uppercase block">Saldo Total a Receber</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{formatCurrency(totalReceivable)}</div>
                    <span className="text-[10px] text-slate-400">Prazos e parcelas</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Clientes Devedores</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">
                      {new Set(openSales.map(s => s.clientId)).size}
                    </div>
                    <span className="text-[10px] text-slate-400">Contas ativas</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] font-bold text-blue-600 uppercase block">Vendas Pendentes</span>
                    <div className="text-lg font-black text-blue-700 mt-0.5">
                      {openSales.length}
                    </div>
                    <span className="text-[10px] text-blue-600 font-medium">Pedidos com saldo</span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Buscar cliente ou venda a receber..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>

                {/* Debtor Sales List */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Vendas com Saldo em Aberto</span>
                    <span className="text-[10px] text-slate-400 font-normal">Clique para ver detalhes</span>
                  </div>

                  {openSales
                    .filter(s => 
                      s.clientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      s.saleNumber.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map(sale => {
                      const badge = getSaleStatusBadge(sale);
                      const isOverdue = isSaleOverdue(sale);

                      return (
                        <div
                          key={sale.id}
                          onClick={() => pushStep({
                            type: 'sale_detail',
                            title: `Conta: ${sale.clientName} (${sale.saleNumber})`,
                            data: sale
                          })}
                          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm">{sale.clientName}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-xs font-bold text-blue-600">{sale.saleNumber}</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Valor Total</span>
                              <span className="font-bold text-slate-800">{formatCurrency(sale.totalAmount)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Já Recebido</span>
                              <span className="font-bold text-emerald-600">{formatCurrency(sale.paidAmount)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-semibold">Saldo a Receber</span>
                              <span className="font-black text-rose-600">{formatCurrency(sale.remainingBalance)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span>Vencimento: <strong className={isOverdue ? 'text-rose-600' : 'text-slate-800'}>{formatDate(sale.dueDate)}</strong></span>
                            {isOverdue && (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                {getDaysOverdue(sale.dueDate)} dias de atraso
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 7. OVERDUE (EM ATRASO - VENCIDO)                                          */}
            {/* ========================================================================= */}
            {currentStep.type === 'overdue' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Top Summary Alert */}
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Inadimplência</span>
                        <h4 className="text-base font-black text-rose-950">Total em Atraso</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-rose-600">{formatCurrency(totalOverdue)}</div>
                      <span className="text-[10px] text-rose-700 font-bold">{overdueSalesList.length} títulos vencidos</span>
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Buscar cliente devedor, venda vencida..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
                  />
                </div>

                {/* Overdue List */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Lista de Vendas Vencidas (Mais Antigos Primeiro)</span>
                    <span className="text-[10px] text-rose-600 font-bold">{overdueSalesList.length} em cobrança</span>
                  </div>

                  {overdueSalesList.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <h4 className="font-black text-slate-900 text-sm">Nenhum título em atraso!</h4>
                      <p className="text-xs text-slate-500">Todas as cobranças e recebimentos estão rigorosamente em dia.</p>
                    </div>
                  ) : (
                    overdueSalesList
                      .filter(s => 
                        s.clientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        s.saleNumber.toLowerCase().includes(searchFilter.toLowerCase())
                      )
                      .map(sale => (
                        <div
                          key={sale.id}
                          onClick={() => pushStep({
                            type: 'sale_detail',
                            title: `Cobrança: ${sale.clientName}`,
                            data: sale
                          })}
                          className="bg-white p-4 rounded-2xl border border-rose-200 hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-sm">{sale.clientName}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono text-xs font-bold text-blue-600">{sale.saleNumber}</span>
                              </div>
                              {sale.client?.phone && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>{sale.client.phone}</span>
                                </div>
                              )}
                            </div>

                            <span className="bg-rose-100 text-rose-800 font-black text-xs px-2.5 py-1 rounded-full border border-rose-200">
                              {sale.daysOverdue} dias de atraso
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-rose-50/50 p-2.5 rounded-xl text-xs border border-rose-100">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Valor Original</span>
                              <span className="font-bold text-slate-800">{formatCurrency(sale.totalAmount)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Vencimento</span>
                              <span className="font-bold text-rose-700">{formatDate(sale.dueDate)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-semibold">Valor em Aberto</span>
                              <span className="font-black text-rose-600 text-sm">{formatCurrency(sale.remainingBalance)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 8. PENDING COMMISSIONS (COMISSÕES PENDENTES)                               */}
            {/* ========================================================================= */}
            {currentStep.type === 'pending_commissions' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Top Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] font-bold text-blue-600 uppercase block">Total Pendente / Liberado</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{formatCurrency(totalCommissionsPending)}</div>
                    <span className="text-[10px] text-slate-400">Aguardando repasse aos representantes</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Quantidade de Comissões</span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">
                      {currentPosition.pendingCommissions.length}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold">Em acompanhamento</span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Buscar representante, cliente ou venda..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>

                {/* Pending Commissions List */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Comissões a Pagar</span>
                    <span className="text-[10px] text-slate-400 font-normal">Clique para ver a venda</span>
                  </div>

                  {commissions
                    .filter(isCommissionPending)
                    .filter(c => 
                      c.commissionerName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      c.clientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      c.saleNumber.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map(comm => {
                      const linkedSale = sales.find(s => s.id === comm.saleId || s.saleNumber === comm.saleNumber);
                      const badge = getCommissionStatusBadge(comm.status);
                      const pendingAmount = comm.totalCommission - comm.paidCommission;

                      return (
                        <div
                          key={comm.id}
                          onClick={() => {
                            if (linkedSale) {
                              pushStep({
                                type: 'sale_detail',
                                title: `Venda: ${comm.saleNumber}`,
                                data: linkedSale
                              });
                            }
                          }}
                          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm">{comm.commissionerName}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-xs font-bold text-blue-600">{comm.saleNumber}</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Cliente</span>
                              <span className="font-bold text-slate-800 truncate block">{comm.clientName}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Total Comissão</span>
                              <span className="font-bold text-slate-800">{formatCurrency(comm.totalCommission)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-semibold">Saldo Pendente</span>
                              <span className="font-black text-blue-700">{formatCurrency(pendingAmount)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 9. SALE DETAIL (DETALHE COMPLETO DA VENDA COM ITENS E MARGENS)             */}
            {/* ========================================================================= */}
            {currentStep.type === 'sale_detail' && currentStep.data && (() => {
              const sale: Sale = currentStep.data;
              const saleMargin = sale.totalAmount > 0 ? (sale.grossProfit / sale.totalAmount) * 100 : 0;
              const badge = getSaleStatusBadge(sale);

              return (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Sale Header Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-blue-600 text-sm sm:text-base">{sale.saleNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">{sale.clientName}</h3>
                        {sale.storeName && (
                          <span className="text-xs text-slate-500">{sale.storeName}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {onOpenReceipt && (
                          <button
                            onClick={() => onOpenReceipt(sale)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                          >
                            <Receipt className="w-3.5 h-3.5 text-slate-600" />
                            <span>Comprovante</span>
                          </button>
                        )}
                        {onOpenRecordPayment && sale.remainingBalance > 0 && (
                          <button
                            onClick={() => onOpenRecordPayment(sale)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Registrar Pagt.</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Financial Summary of the Sale */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">Valor Total</span>
                        <strong className="text-sm font-black text-slate-900">{formatCurrency(sale.totalAmount)}</strong>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">Custo Mercadoria</span>
                        <strong className="text-sm font-black text-rose-600">-{formatCurrency(sale.totalCost)}</strong>
                      </div>

                      <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                        <span className="text-[10px] text-emerald-700 block font-semibold">Lucro Bruto</span>
                        <strong className="text-sm font-black text-emerald-700">+{formatCurrency(sale.grossProfit)}</strong>
                        <span className="text-[9px] text-emerald-600 block font-bold mt-0.5">({saleMargin.toFixed(1)}% margem)</span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">Saldo Restante</span>
                        <strong className={`text-sm font-black ${sale.remainingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {formatCurrency(sale.remainingBalance)}
                        </strong>
                      </div>
                    </div>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span>Data: <strong>{formatDate(sale.createdAt)}</strong></span>
                      <span>Forma: <strong>{getPaymentMethodLabel(sale.paymentMethod)}</strong></span>
                      <span>Vencimento: <strong>{formatDate(sale.dueDate)}</strong></span>
                      {sale.commissionerName && (
                        <span>Representante: <strong className="text-blue-600">{sale.commissionerName}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Itemized Vaccines / Products Table */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-2 p-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span>Produtos / Vacinas Vendidas ({sale.items.length})</span>
                      </span>
                      <span className="text-[11px] font-black text-slate-900">{sale.totalQuantity} unidades</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {sale.items.map((item, idx) => {
                        const itemMargin = item.totalPrice > 0 ? (item.grossProfit / item.totalPrice) * 100 : 0;
                        return (
                          <div key={item.id || idx} className="py-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{item.vaccineName}</span>
                                <span className="ml-2 font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                                  Lote: {item.lotNumber}
                                </span>
                              </div>
                              <span className="font-black text-slate-900 text-xs sm:text-sm">
                                {formatCurrency(item.totalPrice)}
                              </span>
                            </div>

                            <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl text-[11px] border border-slate-100">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Qtd</span>
                                <strong className="text-slate-800">{item.quantity} un</strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Preço Unit.</span>
                                <strong className="text-slate-800">{formatCurrency(item.unitPrice)}</strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Custo Unit.</span>
                                <strong className="text-rose-600">{formatCurrency(item.unitCost)}</strong>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">Lucro Item</span>
                                <strong className="text-emerald-600">+{formatCurrency(item.grossProfit)}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* 10. EXPENSE DETAIL (DETALHE DE UMA DESPESA ESPECÍFICA)                     */}
            {/* ========================================================================= */}
            {currentStep.type === 'expense_detail' && currentStep.data && (() => {
              const exp: FinancialTransaction = currentStep.data;
              return (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Lançamento de Despesa</span>
                      <h3 className="text-lg font-black text-slate-900">{exp.categoryLabel}</h3>
                    </div>
                    <span className="text-xl font-black text-rose-600">-{formatCurrency(exp.amount)}</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Data do Pagamento:</span>
                      <strong className="text-slate-900">{formatDate(exp.date)}</strong>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Origem do Lançamento:</span>
                      <strong className="text-blue-600 font-bold">{exp.isAutomatic ? 'Automático' : 'Manual'}</strong>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Status Financeiro:</span>
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                        Liquidado / Pago
                      </span>
                    </div>

                    <div className="py-2">
                      <span className="text-slate-500 block mb-1 font-semibold">Descrição / Observações:</span>
                      <div className="bg-slate-50 p-3.5 rounded-2xl text-slate-800 font-medium leading-relaxed border border-slate-100">
                        {exp.description}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Footer of Drawer */}
          <div className="bg-white p-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Dados 100% integrados em tempo real</span>
            </div>

            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm"
            >
              Fechar Detalhes
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
