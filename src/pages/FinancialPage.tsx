import React, { useState } from 'react';
import { 
  Landmark, 
  Search, 
  PlusCircle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  Trash2, 
  Calendar, 
  PiggyBank, 
  Package, 
  Percent, 
  Scale,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
  CreditCard,
  Building2,
  Filter,
  X,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  formatCurrency, 
  formatDate, 
  getDaysOverdue, 
  getPaymentStatusBadge, 
  getCommissionStatusBadge, 
  getPaymentMethodLabel 
} from '../utils/formatters';
import { FinancialTransaction, Sale, CommissionEntry } from '../types';
import { RecordPaymentModal } from '../components/modals/RecordPaymentModal';
import { FinancialDetailDrawer, FinancialDrawerType } from '../components/financial/FinancialDetailDrawer';

type FinancialTab = 'todos' | 'entradas' | 'saidas' | 'despesas' | 'comissoes' | 'receber';

export const FinancialPage: React.FC<{ onOpenNewExpense: () => void }> = ({ onOpenNewExpense }) => {
  const { 
    financialTransactions, 
    deleteFinancialTransaction, 
    sales, 
    batches, 
    commissions, 
    payCommission,
    setViewingReceiptSale,
    globalSearch 
  } = useApp();

  // Navigation state (Level 1)
  const [activeTab, setActiveTab] = useState<FinancialTab>('todos');

  // Search & Secondary Filter state (Level 2)
  const [localSearch, setLocalSearch] = useState('');
  const [secondaryFilter, setSecondaryFilter] = useState<string>('todos');

  // Detail Modals & Drill-Down Drawer inside Financial page
  const [drillDownType, setDrillDownType] = useState<FinancialDrawerType | null>(null);
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<FinancialTransaction | null>(null);
  const [saleForPayment, setSaleForPayment] = useState<Sale | null>(null);

  const searchQuery = globalSearch || localSearch;

  // -------------------------------------------------------------
  // Global DRE Indicators (Balanço Geral do Atacado)
  // -------------------------------------------------------------
  const activeSales = sales.filter(s => s.status !== 'cancelado');
  const totalSold = activeSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCostOfGoodsSold = activeSales.reduce((acc, s) => acc + s.totalCost, 0);
  const grossProfit = totalSold - totalCostOfGoodsSold;

  const totalReceived = activeSales.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalReceivable = activeSales.reduce((acc, s) => acc + s.remainingBalance, 0);
  const totalOverdue = activeSales.filter(s => s.status === 'atrasado').reduce((acc, s) => acc + s.remainingBalance, 0);

  // Stock purchases
  const totalStockPurchased = batches.reduce((acc, b) => acc + (b.initialQuantity * b.unitCost), 0);

  // Manual operating expenses
  const operatingExpensesList = financialTransactions.filter(f => f.type === 'saida' && !f.isAutomatic);
  const totalOperatingExpenses = operatingExpensesList.reduce((acc, f) => acc + f.amount, 0);

  // Fixed vs Variable expense categorization
  const fixedCategories = ['aluguel', 'pro_labore', 'contas_empresa', 'software', 'funcionarios'];
  const fixedExpensesTotal = operatingExpensesList
    .filter(f => fixedCategories.includes(f.category))
    .reduce((acc, f) => acc + f.amount, 0);
  const variableExpensesTotal = operatingExpensesList
    .filter(f => !fixedCategories.includes(f.category))
    .reduce((acc, f) => acc + f.amount, 0);

  // Commissions
  const totalCommissionsPaid = commissions.reduce((acc, c) => acc + c.paidCommission, 0);
  const totalCommissionsPending = commissions
    .filter(c => c.status === 'liberada' || c.status === 'parcialmente_liberada' || c.status === 'pendente')
    .reduce((acc, c) => acc + (c.totalCommission - c.paidCommission), 0);
  const totalCommissionGenerated = commissions.reduce((acc, c) => acc + c.totalCommission, 0);

  // Lucro Líquido Estimado = Lucro Bruto - Despesas - Comissões Pagas
  const estimatedNetProfit = grossProfit - totalOperatingExpenses - totalCommissionsPaid;

  // -------------------------------------------------------------
  // Entradas & Saídas Specific Lists
  // -------------------------------------------------------------
  const allEntries = financialTransactions.filter(f => f.type === 'entrada');
  const allOutflows = financialTransactions.filter(f => f.type === 'saida');
  const totalEntriesAmount = allEntries.reduce((acc, f) => acc + f.amount, 0);
  const totalOutflowsAmount = allOutflows.reduce((acc, f) => acc + f.amount, 0);

  // -------------------------------------------------------------
  // Receivables Specific Calculations
  // -------------------------------------------------------------
  const processedReceivables = activeSales.map(sale => {
    const isPaid = sale.remainingBalance <= 0;
    const daysOverdue = getDaysOverdue(sale.dueDate);
    const isOverdue = !isPaid && daysOverdue > 0;
    
    // Check if due within next 7 days
    let isDueSoon = false;
    if (!isPaid && !isOverdue && sale.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(sale.dueDate);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 7) {
        isDueSoon = true;
      }
    }

    return {
      ...sale,
      isPaid,
      daysOverdue,
      isOverdue,
      isDueSoon,
    };
  });

  const totalOnTimeReceivable = processedReceivables
    .filter(s => !s.isPaid && !s.isOverdue)
    .reduce((acc, s) => acc + s.remainingBalance, 0);

  const totalDueSoonReceivable = processedReceivables
    .filter(s => s.isDueSoon)
    .reduce((acc, s) => acc + s.remainingBalance, 0);

  // Handle Level 1 Tab Switching (resets secondary filter)
  const handleTabChange = (tab: FinancialTab) => {
    setActiveTab(tab);
    setSecondaryFilter('todos');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Financeiro & Fluxo de Caixa
            </h1>
            <span className="text-xs font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              DRE e Balanço
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão integrada de faturamento, entradas, saídas, despesas, comissões e contas a receber.
          </p>
        </div>

        <button
          onClick={onOpenNewExpense}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Nova Despesa Manual</span>
        </button>
      </div>

      {/* Main Financial DRE Overview Banner (Preserved Exactly) */}
      <div className="bg-gradient-to-br from-slate-900 via-[#0a1538] to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
              DEMONSTRATIVO DE RESULTADO & LUCRO (DRE)
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              Balanço Geral do Atacado
            </h2>
          </div>
          <div className="flex items-center gap-2 bg-blue-900/60 px-3.5 py-1.5 rounded-full border border-blue-400/30 text-xs text-blue-200 font-semibold self-start sm:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Cálculo Automático em Tempo Real</span>
          </div>
        </div>

        {/* 4 Big Main KPI Tiles (Interactive Drill-Down) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Total Faturado */}
          <div 
            onClick={() => setDrillDownType('revenue')}
            className="bg-white/5 border border-white/10 hover:border-blue-400/50 hover:bg-white/10 p-4 rounded-2xl backdrop-blur-sm transition-all duration-200 cursor-pointer group hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase block">1. Total Faturado</span>
              <span className="text-[10px] text-blue-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                Ver detalhes →
              </span>
            </div>
            <div className="text-2xl font-black text-white mt-1">{formatCurrency(totalSold)}</div>
            <span className="text-[10px] text-slate-400 block mt-0.5">({formatCurrency(totalReceived)} já recebido em caixa)</span>
          </div>

          {/* 2. Lucro Bruto */}
          <div 
            onClick={() => setDrillDownType('gross_profit')}
            className="bg-white/5 border border-white/10 hover:border-emerald-400/50 hover:bg-white/10 p-4 rounded-2xl backdrop-blur-sm transition-all duration-200 cursor-pointer group hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase block">2. Lucro Bruto</span>
              <span className="text-[10px] text-emerald-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                Ver detalhes →
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(grossProfit)}</div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Total Vendas - Custo Mercadorias</span>
          </div>

          {/* 3. Despesas + Comissões */}
          <div 
            onClick={() => setDrillDownType('expenses_commissions')}
            className="bg-white/5 border border-white/10 hover:border-rose-400/50 hover:bg-white/10 p-4 rounded-2xl backdrop-blur-sm transition-all duration-200 cursor-pointer group hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-400 uppercase block">3. Despesas + Comissões</span>
              <span className="text-[10px] text-rose-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                Ver detalhes →
              </span>
            </div>
            <div className="text-2xl font-black text-rose-300 mt-1">
              {formatCurrency(totalOperatingExpenses + totalCommissionsPaid)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Despesas: {formatCurrency(totalOperatingExpenses)} • Comissões: {formatCurrency(totalCommissionsPaid)}
            </span>
          </div>

          {/* 4. Lucro Líquido Estimado */}
          <div 
            onClick={() => setDrillDownType('net_profit')}
            className="bg-blue-600/90 border border-blue-400/50 hover:bg-blue-600 hover:border-blue-300 p-4 rounded-2xl backdrop-blur-sm shadow-blue-glow transition-all duration-200 cursor-pointer group hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-100 uppercase block">4. Lucro Líquido Estimado</span>
              <span className="text-[10px] text-white font-bold opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                Ver composição →
              </span>
            </div>
            <div className="text-2xl font-black text-white mt-1">{formatCurrency(estimatedNetProfit)}</div>
            <span className="text-[10px] text-blue-100 font-medium block mt-0.5">Lucro Real Líquido do Negócio</span>
          </div>
        </div>

        {/* Breakdown Row (Interactive Indicators) */}
        <div className="pt-2 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          
          <div 
            onClick={() => setDrillDownType('stock_purchased')}
            className="p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-150 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 block group-hover:text-slate-200 transition-colors">Estoque Comprado:</span>
              <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
            <strong className="text-slate-200 text-sm block mt-0.5">{formatCurrency(totalStockPurchased)}</strong>
          </div>

          <div 
            onClick={() => setDrillDownType('receivables')}
            className="p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-150 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 block group-hover:text-amber-200 transition-colors">Saldo a Receber (Prazo):</span>
              <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
            <strong className="text-amber-300 text-sm block mt-0.5">{formatCurrency(totalReceivable)}</strong>
          </div>

          <div 
            onClick={() => setDrillDownType('overdue')}
            className="p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-150 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 block group-hover:text-rose-200 transition-colors">Em Atraso (Vencido):</span>
              <span className="text-[10px] text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
            <strong className="text-rose-400 text-sm block mt-0.5">{formatCurrency(totalOverdue)}</strong>
          </div>

          <div 
            onClick={() => setDrillDownType('pending_commissions')}
            className="p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-150 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 block group-hover:text-blue-200 transition-colors">Comissões Pendentes:</span>
              <span className="text-[10px] text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
            <strong className="text-blue-300 text-sm block mt-0.5">{formatCurrency(totalCommissionsPending)}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NÍVEL 1: NAVEGAÇÃO FINANCEIRA PRINCIPAL (Tabs / Pills Modernas)           */}
      {/* ========================================================================= */}
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-card">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'todos', label: 'Visão Geral / Todos' },
            { id: 'entradas', label: 'Entradas' },
            { id: 'saidas', label: 'Saídas' },
            { id: 'despesas', label: 'Despesas' },
            { id: 'comissoes', label: 'Comissões' },
            { id: 'receber', label: 'Contas a Receber' },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as FinancialTab)}
                className={`
                  px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95
                  ${isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/90 hover:text-slate-900'
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTEÚDO DINÂMICO CONFORME A TAB SELECIONADA                              */}
      {/* ========================================================================= */}

      {/* ------------------------------------------------------------------------- */}
      {/* 1. VISÃO GERAL / TODOS                                                    */}
      {/* ------------------------------------------------------------------------- */}
      {activeTab === 'todos' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* NÍVEL 2: Filtros secundários + Busca */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Buscar em todos os lançamentos..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              <span className="text-[10px] font-bold uppercase text-slate-400 mr-1 hidden md:inline">Filtro:</span>
              {[
                { id: 'todos', label: 'Todos os Lançamentos' },
                { id: 'entradas', label: 'Entradas' },
                { id: 'saidas', label: 'Saídas' },
                { id: 'automaticas', label: 'Automáticos' },
                { id: 'manuais', label: 'Despesas Manuais' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSecondaryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    secondaryFilter === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Data</th>
                    <th className="p-3.5">Tipo</th>
                    <th className="p-3.5">Categoria</th>
                    <th className="p-3.5">Descrição do Lançamento</th>
                    <th className="p-3.5 text-center">Origem</th>
                    <th className="p-3.5 text-right">Valor</th>
                    <th className="p-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financialTransactions
                    .filter(f => {
                      const matchesSearch =
                        f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        f.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
                      if (!matchesSearch) return false;
                      if (secondaryFilter === 'entradas') return f.type === 'entrada';
                      if (secondaryFilter === 'saidas') return f.type === 'saida';
                      if (secondaryFilter === 'automaticas') return f.isAutomatic;
                      if (secondaryFilter === 'manuais') return !f.isAutomatic;
                      return true;
                    })
                    .map((tx) => {
                      const isEntry = tx.type === 'entrada';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-bold text-slate-800">{formatDate(tx.date)}</td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isEntry
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isEntry ? <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-rose-600" />}
                              {isEntry ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-700">{tx.categoryLabel}</td>
                          <td className="p-3.5 font-medium text-slate-900 max-w-[320px] truncate">{tx.description}</td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              tx.isAutomatic ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {tx.isAutomatic ? 'Automático' : 'Manual'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-black text-sm">
                            <span className={isEntry ? 'text-emerald-600' : 'text-slate-900'}>
                              {isEntry ? '+' : '-'}{formatCurrency(tx.amount)}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            {!tx.isAutomatic && (
                              <button
                                onClick={() => {
                                  if (confirm('Deseja excluir este lançamento manual?')) {
                                    deleteFinancialTransaction(tx.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Excluir lançamento manual"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 2. ENTRADAS                                                               */}
      {/* ------------------------------------------------------------------------- */}
      {activeTab === 'entradas' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Mini Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-emerald-600">Total de Entradas</span>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">{formatCurrency(totalEntriesAmount)}</div>
              <span className="text-[10px] text-slate-400">Total acumulado de recebimentos</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-blue-600">Entradas Recebidas em Caixa</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{formatCurrency(totalReceived)}</div>
              <span className="text-[10px] text-slate-400">Vendas à vista + parcelas quitadas</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-slate-400">Quantidade de Lançamentos</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{allEntries.length} entradas</div>
              <span className="text-[10px] text-emerald-600 font-semibold">Fluxo de receita ativo</span>
            </div>
          </div>

          {/* NÍVEL 2: Filtros de Entradas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Buscar entradas..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'todos', label: 'Todas as Entradas' },
                { id: 'venda_a_vista', label: 'Vendas à Vista' },
                { id: 'entrada_venda', label: 'Entradas de Pedidos' },
                { id: 'recebimento_parcela', label: 'Recebimento de Parcelas' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSecondaryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    secondaryFilter === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table of Entries */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Data</th>
                    <th className="p-3.5">Categoria</th>
                    <th className="p-3.5">Descrição do Recebimento</th>
                    <th className="p-3.5 text-center">Origem</th>
                    <th className="p-3.5 text-right">Valor Recebido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allEntries
                    .filter(f => {
                      const matches = f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      f.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
                      if (!matches) return false;
                      if (secondaryFilter !== 'todos' && f.category !== secondaryFilter) return false;
                      return true;
                    })
                    .map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-800">{formatDate(tx.date)}</td>
                        <td className="p-3.5 font-semibold text-emerald-700">
                          <span className="bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {tx.categoryLabel}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-900">{tx.description}</td>
                        <td className="p-3.5 text-center">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            {tx.isAutomatic ? 'Automático' : 'Manual'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black text-sm text-emerald-600">
                          +{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 3. SAÍDAS                                                                 */}
      {/* ------------------------------------------------------------------------- */}
      {activeTab === 'saidas' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Mini Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-rose-600">Total de Saídas no Período</span>
              <div className="text-2xl font-black text-rose-600 mt-0.5">{formatCurrency(totalOutflowsAmount)}</div>
              <span className="text-[10px] text-slate-400">Estoque + despesas + comissões</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-slate-400">Compras de Estoque</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(totalStockPurchased)}</div>
              <span className="text-[10px] text-blue-600 font-semibold">{batches.length} lotes adquiridos</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-slate-400">Despesas Operacionais</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(totalOperatingExpenses)}</div>
              <span className="text-[10px] text-slate-400">Fretes, aluguel, salários, etc.</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-slate-400">Comissões Pagas</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(totalCommissionsPaid)}</div>
              <span className="text-[10px] text-slate-400">Repasses aos representantes</span>
            </div>
          </div>

          {/* NÍVEL 2: Filtros de Saídas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Buscar saídas..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'todos', label: 'Todas as Saídas' },
                { id: 'compra_estoque', label: 'Compras de Estoque' },
                { id: 'comissao_paga', label: 'Comissões' },
                { id: 'despesas_operacionais', label: 'Despesas Operacionais' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSecondaryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    secondaryFilter === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table of Outflows */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Data</th>
                    <th className="p-3.5">Categoria</th>
                    <th className="p-3.5">Descrição do Pagamento</th>
                    <th className="p-3.5 text-center">Origem</th>
                    <th className="p-3.5 text-right">Valor Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allOutflows
                    .filter(f => {
                      const matches = f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      f.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
                      if (!matches) return false;
                      if (secondaryFilter === 'compra_estoque') return f.category === 'compra_estoque';
                      if (secondaryFilter === 'comissao_paga') return f.category === 'comissao_paga';
                      if (secondaryFilter === 'despesas_operacionais') return f.category !== 'compra_estoque' && f.category !== 'comissao_paga';
                      return true;
                    })
                    .map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-800">{formatDate(tx.date)}</td>
                        <td className="p-3.5 font-semibold text-rose-700">
                          <span className="bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            {tx.categoryLabel}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-900">{tx.description}</td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            tx.isAutomatic ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {tx.isAutomatic ? 'Automático' : 'Manual'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black text-sm text-slate-900">
                          -{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 4. DESPESAS (Área específica para gestão de despesas da empresa)           */}
      {/* ------------------------------------------------------------------------- */}
      {activeTab === 'despesas' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Top 4 Metric Cards for Expenses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total de Despesas</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{formatCurrency(totalOperatingExpenses)}</div>
              <span className="text-[10px] text-slate-500">{operatingExpensesList.length} despesas registradas</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-blue-600">Despesas Fixas</span>
              <div className="text-2xl font-black text-blue-700 mt-0.5">{formatCurrency(fixedExpensesTotal)}</div>
              <span className="text-[10px] text-slate-400">Aluguel, salários, sistemas, luz</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-amber-600">Despesas Variáveis</span>
              <div className="text-2xl font-black text-amber-600 mt-0.5">{formatCurrency(variableExpensesTotal)}</div>
              <span className="text-[10px] text-slate-400">Fretes, combustível, impostos</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-emerald-600">Despesas Pagas</span>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">{formatCurrency(totalOperatingExpenses)}</div>
              <span className="text-[10px] text-emerald-600 font-semibold">100% liquidadas</span>
            </div>
          </div>

          {/* Action Bar & Secondary Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Buscar por categoria, descrição..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: 'todos', label: 'Todas' },
                  { id: 'fixa', label: 'Fixas' },
                  { id: 'variavel', label: 'Variáveis' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSecondaryFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      secondaryFilter === f.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={onOpenNewExpense}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Nova Despesa</span>
              </button>
            </div>
          </div>

          {/* Detailed Expenses Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Data</th>
                    <th className="p-3.5">Categoria</th>
                    <th className="p-3.5">Descrição</th>
                    <th className="p-3.5 text-center">Tipo</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Forma de Pagamento</th>
                    <th className="p-3.5 text-right">Valor</th>
                    <th className="p-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {operatingExpensesList
                    .filter(f => {
                      const matches = f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      f.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
                      if (!matches) return false;
                      const isFixed = fixedCategories.includes(f.category);
                      if (secondaryFilter === 'fixa') return isFixed;
                      if (secondaryFilter === 'variavel') return !isFixed;
                      return true;
                    })
                    .map((exp) => {
                      const isFixed = fixedCategories.includes(exp.category);
                      return (
                        <tr 
                          key={exp.id} 
                          onClick={() => setSelectedExpenseDetail(exp)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          <td className="p-3.5 font-bold text-slate-800">{formatDate(exp.date)}</td>
                          <td className="p-3.5 font-semibold text-slate-900">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
                              {exp.categoryLabel}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-slate-900 max-w-[260px] truncate">{exp.description}</td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isFixed ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {isFixed ? 'Fixa' : 'Variável'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              Pago
                            </span>
                          </td>
                          <td className="p-3.5 text-center text-slate-600 font-medium">
                            PIX / TED
                          </td>
                          <td className="p-3.5 text-right font-black text-sm text-slate-900">
                            {formatCurrency(exp.amount)}
                          </td>
                          <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedExpenseDetail(exp)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Visualizar Detalhes"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Deseja excluir a despesa "${exp.description}"?`)) {
                                    deleteFinancialTransaction(exp.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 5. COMISSÕES (Visão exclusiva de comissões)                               */}
      {/* ------------------------------------------------------------------------- */}
      {activeTab === 'comissoes' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Mini Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total de Comissões Previstas</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{formatCurrency(totalCommissionGenerated)}</div>
              <span className="text-[10px] text-slate-400">{commissions.length} registros de representantes</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-emerald-600">Comissões Pagas</span>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">{formatCurrency(totalCommissionsPaid)}</div>
              <span className="text-[10px] text-emerald-600 font-semibold">Repassadas e lançadas na DRE</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-amber-500">Comissões Pendentes / Liberadas</span>
              <div className="text-2xl font-black text-amber-600 mt-0.5">{formatCurrency(totalCommissionsPending)}</div>
              <span className="text-[10px] text-amber-600 font-medium">Aguardando repasse conforme pagamento</span>
            </div>
          </div>

          {/* NÍVEL 2: Filtros de Comissões */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Buscar por representante, cliente, venda..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'todos', label: 'Todas' },
                { id: 'liberada', label: 'Liberadas' },
                { id: 'parcialmente_liberada', label: 'Parciais' },
                { id: 'pendente', label: 'Pendentes' },
                { id: 'paga', label: 'Pagas' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSecondaryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    secondaryFilter === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table of Commissions */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Representante / Vendedor</th>
                    <th className="p-3.5">Venda Relacionada</th>
                    <th className="p-3.5">Cliente Indicado</th>
                    <th className="p-3.5 text-center">Unidades</th>
                    <th className="p-3.5 text-right">Taxa / un</th>
                    <th className="p-3.5 text-right">Valor Comissão</th>
                    <th className="p-3.5 text-right">Liberado</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5">Data</th>
                    <th className="p-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {commissions
                    .filter(c => {
                      const matches = c.commissionerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      c.saleNumber.toLowerCase().includes(searchQuery.toLowerCase());
                      if (!matches) return false;
                      if (secondaryFilter !== 'todos' && c.status !== secondaryFilter) return false;
                      return true;
                    })
                    .map((comm) => {
                      const badge = getCommissionStatusBadge(comm.status);
                      const amountAvailableToPay = Math.max(0, comm.releasedCommission - comm.paidCommission);

                      return (
                        <tr key={comm.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-extrabold text-slate-900">{comm.commissionerName}</td>
                          <td className="p-3.5 font-mono font-bold text-blue-600">{comm.saleNumber}</td>
                          <td className="p-3.5 font-medium text-slate-800">{comm.clientName}</td>
                          <td className="p-3.5 text-center font-bold">{comm.totalUnits} un</td>
                          <td className="p-3.5 text-right text-slate-600">{formatCurrency(comm.ratePerUnit)}</td>
                          <td className="p-3.5 text-right font-bold text-slate-900">{formatCurrency(comm.totalCommission)}</td>
                          <td className="p-3.5 text-right font-black text-blue-700">{formatCurrency(comm.releasedCommission)}</td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-500">{formatDate(comm.lastUpdated)}</td>
                          <td className="p-3.5 text-center">
                            {comm.status === 'paga' ? (
                              <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Paga
                              </span>
                            ) : amountAvailableToPay > 0 ? (
                              <button
                                onClick={() => {
                                  if (confirm(`Confirmar o pagamento de ${formatCurrency(amountAvailableToPay)} para ${comm.commissionerName}?`)) {
                                    payCommission(comm.id);
                                  }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1 rounded-xl shadow-sm transition-all whitespace-nowrap active:scale-95"
                              >
                                Pagar {formatCurrency(amountAvailableToPay)}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Pendente</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 6. CONTAS A RECEBER (Visão integrada de recebíveis)                       */}
      {/* ------------------------------------------------------------------------- */}
      {activeTab === 'receber' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Top 4 Metric Cards for Receivables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total a Receber</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{formatCurrency(totalReceivable)}</div>
              <span className="text-[10px] text-slate-500">Saldo global a receber de clientes</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-emerald-600">Em Dia</span>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">{formatCurrency(totalOnTimeReceivable)}</div>
              <span className="text-[10px] text-slate-400">Vencimento futuro no prazo</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
              <span className="text-[11px] font-bold uppercase text-amber-500">Vencendo Logo (≤ 7 dias)</span>
              <div className="text-2xl font-black text-amber-600 mt-0.5">{formatCurrency(totalDueSoonReceivable)}</div>
              <span className="text-[10px] text-amber-600 font-medium">Atenção ao prazo próximo</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-card bg-rose-50/30">
              <span className="text-[11px] font-bold uppercase text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Em Atraso
              </span>
              <div className="text-2xl font-black text-rose-600 mt-0.5">{formatCurrency(totalOverdue)}</div>
              <span className="text-[10px] text-rose-600 font-semibold">Títulos vencidos pendentes</span>
            </div>
          </div>

          {/* NÍVEL 2: Filtros de Contas a Receber */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Buscar por cliente, venda..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'em_dia', label: 'Em Dia' },
                { id: 'vencendo', label: 'Vencendo Logo' },
                { id: 'atrasados', label: 'Em Atraso' },
                { id: 'quitados', label: 'Quitados' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSecondaryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    secondaryFilter === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table of Receivables */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Venda</th>
                    <th className="p-3.5 text-right">Valor Total</th>
                    <th className="p-3.5 text-right">Valor Recebido</th>
                    <th className="p-3.5 text-right">Saldo Restante</th>
                    <th className="p-3.5">Vencimento</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedReceivables
                    .filter(sale => {
                      const matches = sale.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      sale.saleNumber.toLowerCase().includes(searchQuery.toLowerCase());
                      if (!matches) return false;
                      if (secondaryFilter === 'atrasados') return sale.isOverdue;
                      if (secondaryFilter === 'vencendo') return sale.isDueSoon;
                      if (secondaryFilter === 'em_dia') return !sale.isPaid && !sale.isOverdue;
                      if (secondaryFilter === 'quitados') return sale.isPaid;
                      return true;
                    })
                    .map((sale) => {
                      const badge = getPaymentStatusBadge(sale.status);
                      return (
                        <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-extrabold text-slate-900">
                            {sale.clientName}
                            {sale.storeName && (
                              <div className="text-[11px] text-slate-500 font-normal">{sale.storeName}</div>
                            )}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-blue-600">{sale.saleNumber}</td>
                          <td className="p-3.5 text-right font-bold text-slate-900">{formatCurrency(sale.totalAmount)}</td>
                          <td className="p-3.5 text-right font-bold text-emerald-600">{formatCurrency(sale.paidAmount)}</td>
                          <td className="p-3.5 text-right font-black text-sm">
                            {sale.remainingBalance > 0 ? (
                              <span className="text-rose-600">{formatCurrency(sale.remainingBalance)}</span>
                            ) : (
                              <span className="text-emerald-600">R$ 0,00</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-800">{formatDate(sale.dueDate)}</div>
                            {sale.isOverdue && (
                              <span className="text-[10px] font-bold text-rose-600">{sale.daysOverdue} dias atras.</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {sale.remainingBalance > 0 ? (
                                <button
                                  onClick={() => setSaleForPayment(sale)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1 rounded-xl shadow-sm transition-all whitespace-nowrap active:scale-95"
                                >
                                  Registrar Pagt.
                                </button>
                              ) : (
                                <span className="text-[11px] text-emerald-600 font-bold">Quitado</span>
                              )}

                              <button
                                onClick={() => setViewingReceiptSale(sale)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Ver Comprovante"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* Modal de Detalhes da Despesa (Ao clicar na linha da tabela de despesas)     */}
      {/* ------------------------------------------------------------------------- */}
      {selectedExpenseDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">Detalhes da Despesa</h3>
              </div>
              <button
                onClick={() => setSelectedExpenseDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500">Valor da Despesa:</span>
                <span className="text-base font-black text-rose-600">{formatCurrency(selectedExpenseDetail.amount)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Categoria:</span>
                <span className="font-bold text-slate-800">{selectedExpenseDetail.categoryLabel}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Tipo de Custo:</span>
                <span className="font-bold text-slate-800">
                  {fixedCategories.includes(selectedExpenseDetail.category) ? 'Despesa Fixa' : 'Despesa Variável'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Data do Lançamento:</span>
                <span className="font-bold text-slate-800">{formatDate(selectedExpenseDetail.date)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Pago / Liquidado
                </span>
              </div>

              <div className="py-2">
                <span className="text-slate-500 block mb-1">Descrição Completa:</span>
                <p className="bg-slate-50 p-3 rounded-xl text-slate-800 font-medium leading-relaxed">
                  {selectedExpenseDetail.description}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedExpenseDetail(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drill-Down Hierarchical Drawer */}
      <FinancialDetailDrawer
        isOpen={!!drillDownType}
        onClose={() => setDrillDownType(null)}
        initialType={drillDownType || 'revenue'}
        onOpenRecordPayment={(sale) => {
          setDrillDownType(null);
          setSaleForPayment(sale);
        }}
        onOpenReceipt={(sale) => {
          setViewingReceiptSale(sale);
        }}
      />

      {/* Record Payment Modal integration */}
      <RecordPaymentModal
        isOpen={!!saleForPayment}
        onClose={() => setSaleForPayment(null)}
        sale={saleForPayment}
      />
    </div>
  );
};
