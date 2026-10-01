// Regras financeiras únicas do sistema (Financeiro, Relatórios, Contas a Receber, Dashboard).
// Módulo puro: sem React e só com imports de tipo, para ser testável isoladamente.
import type { Sale, FinancialTransaction, CommissionEntry, PaymentStatus } from '../types';

// ============================================================================
// DATAS
// ============================================================================

// "YYYY-MM-DD" é interpretado como data LOCAL. `new Date('2026-09-01')` seria meia-noite UTC,
// que no Brasil (UTC-3) cai em 31/08 às 21h e jogaria o lançamento para o mês anterior.
export const parseLocalDate = (value: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
};

// Data LOCAL no formato "YYYY-MM-DD". Não usar `toISOString().split('T')[0]`: ele devolve o dia
// em UTC, e no Brasil qualquer lançamento feito depois das 21h sairia com a data do dia seguinte.
export const toLocalISODate = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const startOfDay = (d: Date): Date => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };
export const endOfDay = (d: Date): Date => { const c = new Date(d); c.setHours(23, 59, 59, 999); return c; };

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Diferença em dias de calendário (b - a), imune a horário de verão.
const calendarDaysBetween = (a: Date, b: Date): number =>
  Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / MS_PER_DAY);

// ============================================================================
// PERÍODOS
// ============================================================================

export type PeriodPreset =
  | 'hoje' | 'ontem' | '7d' | '30d'
  | 'mes_atual' | 'mes_anterior' | '3_meses' | 'ano_atual'
  | 'todo' | 'personalizado';

export interface PeriodSelection {
  period: PeriodPreset;
  customStart?: string; // YYYY-MM-DD
  customEnd?: string; // YYYY-MM-DD
}

export interface PeriodRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  '7d': '7 dias',
  '30d': '30 dias',
  mes_atual: 'Este mês',
  mes_anterior: 'Mês anterior',
  '3_meses': 'Últimos 3 meses',
  ano_atual: 'Este ano',
  todo: 'Todo o período',
  personalizado: 'Personalizado',
};

const ALL_TIME_START = new Date(0);
const ALL_TIME_END = new Date(8.64e15);

// Intervalo [start, end] inclusivo do período, e o intervalo anterior de mesma natureza
// (usado para o comparativo "vs. período anterior").
export const getPeriodRange = (sel: PeriodSelection, now: Date = new Date()): PeriodRange => {
  const today = startOfDay(now);
  const y = today.getFullYear();
  const m = today.getMonth();

  const lastNDays = (n: number): PeriodRange => {
    const start = new Date(today); start.setDate(start.getDate() - (n - 1));
    const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - (n - 1));
    return { start, end: endOfDay(today), prevStart, prevEnd: endOfDay(prevEnd) };
  };

  switch (sel.period) {
    case 'hoje':
      return lastNDays(1);
    case 'ontem': {
      const start = new Date(y, m, today.getDate() - 1);
      const prevStart = new Date(y, m, today.getDate() - 2);
      return { start, end: endOfDay(start), prevStart, prevEnd: endOfDay(prevStart) };
    }
    case '7d':
      return lastNDays(7);
    case '30d':
      return lastNDays(30);
    // Meses/ano de calendário completos: uma despesa lançada com data de 30/09 entra em "Setembro"
    // mesmo antes do dia 30 chegar.
    case 'mes_atual':
      return { start: new Date(y, m, 1), end: endOfDay(new Date(y, m + 1, 0)), prevStart: new Date(y, m - 1, 1), prevEnd: endOfDay(new Date(y, m, 0)) };
    case 'mes_anterior':
      return { start: new Date(y, m - 1, 1), end: endOfDay(new Date(y, m, 0)), prevStart: new Date(y, m - 2, 1), prevEnd: endOfDay(new Date(y, m - 1, 0)) };
    case '3_meses':
      return { start: new Date(y, m - 2, 1), end: endOfDay(new Date(y, m + 1, 0)), prevStart: new Date(y, m - 5, 1), prevEnd: endOfDay(new Date(y, m - 2, 0)) };
    case 'ano_atual':
      return { start: new Date(y, 0, 1), end: endOfDay(new Date(y, 11, 31)), prevStart: new Date(y - 1, 0, 1), prevEnd: endOfDay(new Date(y - 1, 11, 31)) };
    case 'todo':
      return { start: ALL_TIME_START, end: ALL_TIME_END, prevStart: ALL_TIME_START, prevEnd: ALL_TIME_START };
    case 'personalizado': {
      let startDay = sel.customStart ? parseLocalDate(sel.customStart) : new Date(y, m, 1);
      let endDay = sel.customEnd ? parseLocalDate(sel.customEnd) : today;
      if (startDay > endDay) [startDay, endDay] = [endDay, startDay];
      const start = startOfDay(startDay);
      const end = endOfDay(endDay);
      const duration = end.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - duration);
      return { start, end, prevStart, prevEnd };
    }
  }
};

export const isInRange = (date: Date, start: Date, end: Date): boolean => date >= start && date <= end;

const formatDayMonthYear = (d: Date): string =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

const formatMonthYear = (d: Date): string => {
  const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Título legível do período, ex.: "Setembro de 2026", "2026", "01/07/2026 – 29/09/2026".
export const getPeriodTitle = (sel: PeriodSelection, range: PeriodRange): string => {
  if (sel.period === 'todo') return 'Todo o período';
  if (sel.period === 'mes_atual' || sel.period === 'mes_anterior') return formatMonthYear(range.start);
  if (sel.period === 'ano_atual') return String(range.start.getFullYear());
  const start = formatDayMonthYear(range.start);
  const end = formatDayMonthYear(range.end);
  return start === end ? start : `${start} – ${end}`;
};

export const FINANCIAL_PERIOD_OPTIONS: PeriodPreset[] = ['mes_atual', 'mes_anterior', '3_meses', 'ano_atual', 'todo', 'personalizado'];

// ============================================================================
// VENDAS: status efetivo (fonte única para "vencido")
// ============================================================================

// Campos usados no cálculo de status (compartilhado com a visão do vendedor, que não tem custo).
export type SaleStatusFields = Pick<Sale, 'status' | 'remainingBalance' | 'dueDate' | 'paidAmount'>;

export const isSaleActive = (sale: Pick<Sale, 'status'>): boolean => sale.status !== 'cancelado';

export const getDaysOverdue = (dueDate: string | undefined, now: Date = new Date()): number => {
  if (!dueDate) return 0;
  const days = calendarDaysBetween(parseLocalDate(dueDate), now);
  return days > 0 ? days : 0;
};

// Dias até o vencimento (0 = vence hoje, negativo = já venceu). Infinity se não houver vencimento.
export const getDaysUntilDue = (dueDate: string | undefined, now: Date = new Date()): number => {
  if (!dueDate) return Infinity;
  return calendarDaysBetween(now, parseLocalDate(dueDate));
};

// Conta vencida = venda não cancelada, com saldo em aberto e vencimento anterior a hoje.
export const isSaleOverdue = (sale: SaleStatusFields, now: Date = new Date()): boolean =>
  isSaleActive(sale) && sale.remainingBalance > 0 && getDaysOverdue(sale.dueDate, now) > 0;

// Status calculado na hora, a partir dos valores e do vencimento. O `sale.status` gravado só é
// atualizado ao criar a venda ou registrar pagamento, então fica desatualizado quando o prazo vence.
export const getEffectiveSaleStatus = (sale: SaleStatusFields, now: Date = new Date()): PaymentStatus => {
  if (!isSaleActive(sale)) return 'cancelado';
  if (sale.remainingBalance <= 0) return 'pago';
  if (isSaleOverdue(sale, now)) return 'atrasado';
  if (sale.paidAmount > 0) return 'parcialmente_pago';
  return 'pendente';
};

export const filterSalesInRange = (sales: Sale[], start: Date, end: Date): Sale[] =>
  sales.filter(s => isSaleActive(s) && isInRange(new Date(s.createdAt), start, end));

export interface SalesTotals {
  vendas: number;
  recebido: number; // quanto DESSAS vendas já foi recebido até hoje (sale.paidAmount)
  aReceber: number;
  custo: number; // custo histórico gravado na venda (SaleItem.unitCost no momento da venda)
  lucro: number;
  margem: number;
  unidades: number;
  salesCount: number;
}

export const computeSalesTotals = (sales: Sale[]): SalesTotals => {
  const vendas = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const recebido = sales.reduce((acc, s) => acc + s.paidAmount, 0);
  const custo = sales.reduce((acc, s) => acc + s.totalCost, 0);
  const lucro = vendas - custo;
  return {
    vendas,
    recebido,
    aReceber: vendas - recebido,
    custo,
    lucro,
    margem: vendas > 0 ? (lucro / vendas) * 100 : 0,
    unidades: sales.reduce((acc, s) => acc + s.totalQuantity, 0),
    salesCount: sales.length,
  };
};

// ============================================================================
// LANÇAMENTOS FINANCEIROS (despesas, comissões pagas, compras de estoque)
// Todos entram no período pela data do lançamento (`tx.date`).
// ============================================================================

// Estorno: entradas/pagamentos de venda cancelada ficam no histórico, mas não somam.
export const isReversed = (record: { reversedAt?: string }): boolean => !!record.reversedAt;
export const isCountedEntry = (tx: FinancialTransaction): boolean => tx.type === 'entrada' && !isReversed(tx);

// Marca como estornadas as entradas e pagamentos de vendas canceladas que ainda não estão
// estornados. Idempotente: registros já estornados não mudam. Retorna null se não há nada a fazer.
export const applySaleReversals = <P extends { saleId: string; reversedAt?: string; reversalReason?: string }>(
  sales: Sale[],
  transactions: FinancialTransaction[],
  payments: P[],
  nowIso: string = new Date().toISOString(),
): { transactions: FinancialTransaction[]; payments: P[]; reversedAmount: number } | null => {
  const cancelled = new Map(sales.filter(s => !isSaleActive(s)).map(s => [s.id, s]));
  if (cancelled.size === 0) return null;
  let changed = false;
  let reversedAmount = 0;
  const reason = (saleId: string) => `Venda ${cancelled.get(saleId)!.saleNumber} cancelada`;
  const nextTransactions = transactions.map(tx => {
    if (tx.type !== 'entrada' || !tx.referenceId || !cancelled.has(tx.referenceId) || isReversed(tx)) return tx;
    changed = true;
    reversedAmount += tx.amount;
    return { ...tx, reversedAt: nowIso, reversalReason: reason(tx.referenceId) };
  });
  const nextPayments = payments.map(p => {
    if (!cancelled.has(p.saleId) || isReversed(p)) return p;
    changed = true;
    return { ...p, reversedAt: nowIso, reversalReason: reason(p.saleId) };
  });
  return changed ? { transactions: nextTransactions, payments: nextPayments, reversedAmount } : null;
};

export const isOperatingExpense = (tx: FinancialTransaction): boolean => tx.type === 'saida' && !tx.isAutomatic;
export const isCommissionPayment = (tx: FinancialTransaction): boolean => tx.type === 'saida' && tx.category === 'comissao_paga';
export const isStockPurchase = (tx: FinancialTransaction): boolean => tx.type === 'saida' && tx.category === 'compra_estoque';

export const filterTransactionsInRange = (
  txs: FinancialTransaction[],
  start: Date,
  end: Date,
  predicate: (tx: FinancialTransaction) => boolean,
): FinancialTransaction[] => txs.filter(tx => predicate(tx) && isInRange(parseLocalDate(tx.date), start, end));

const sumAmount = (txs: FinancialTransaction[]): number => txs.reduce((acc, tx) => acc + tx.amount, 0);

// ============================================================================
// RESULTADO DO PERÍODO (DRE)
// ============================================================================

export interface PeriodResult extends SalesTotals {
  lucroBruto: number;
  despesas: number;
  comissoes: number;
  lucroLiquido: number;
  comprasEstoque: number;
  sales: Sale[];
  expenses: FinancialTransaction[];
  commissionPayments: FinancialTransaction[];
  stockPurchases: FinancialTransaction[];
}

export const computePeriodResult = (
  sales: Sale[],
  transactions: FinancialTransaction[],
  start: Date,
  end: Date,
): PeriodResult => {
  const periodSales = filterSalesInRange(sales, start, end);
  const totals = computeSalesTotals(periodSales);
  const expenses = filterTransactionsInRange(transactions, start, end, isOperatingExpense);
  const commissionPayments = filterTransactionsInRange(transactions, start, end, isCommissionPayment);
  const stockPurchases = filterTransactionsInRange(transactions, start, end, isStockPurchase);
  const despesas = sumAmount(expenses);
  const comissoes = sumAmount(commissionPayments);
  return {
    ...totals,
    lucroBruto: totals.lucro,
    despesas,
    comissoes,
    lucroLiquido: totals.lucro - despesas - comissoes,
    comprasEstoque: sumAmount(stockPurchases),
    sales: periodSales,
    expenses,
    commissionPayments,
    stockPurchases,
  };
};

// ============================================================================
// POSIÇÃO ATUAL (fotografia de hoje, independente de período)
// ============================================================================

export const isCommissionPending = (c: CommissionEntry): boolean => c.status !== 'paga' && c.status !== 'cancelada';

export interface CurrentPosition {
  saldoAReceber: number;
  emAtraso: number;
  comissoesPendentes: number;
  openSales: Sale[];
  overdueSales: Sale[];
  pendingCommissions: CommissionEntry[];
}

export const computeCurrentPosition = (sales: Sale[], commissions: CommissionEntry[], now: Date = new Date()): CurrentPosition => {
  const openSales = sales.filter(s => isSaleActive(s) && s.remainingBalance > 0);
  const overdueSales = openSales.filter(s => isSaleOverdue(s, now));
  const pendingCommissions = commissions.filter(isCommissionPending);
  return {
    saldoAReceber: openSales.reduce((acc, s) => acc + s.remainingBalance, 0),
    emAtraso: overdueSales.reduce((acc, s) => acc + s.remainingBalance, 0),
    comissoesPendentes: pendingCommissions.reduce((acc, c) => acc + (c.totalCommission - c.paidCommission), 0),
    openSales,
    overdueSales,
    pendingCommissions,
  };
};

// ============================================================================
// SÉRIE DO GRÁFICO "EVOLUÇÃO DE VENDAS E LUCRO"
// Só usa vendas reais (não canceladas). Nada de meses antes da primeira venda.
// ============================================================================

export type ChartScope = 'dia' | 'semana' | 'mes' | 'ano';

export interface ChartPoint {
  label: string;
  tooltipLabel: string;
  sales: number; // faturamento (soma de totalAmount)
  profit: number; // lucro bruto (totalAmount - totalCost, custo gravado no momento da venda)
}

export interface ChartSeries {
  points: ChartPoint[];
  totalSales: number;
  totalProfit: number;
  prevSales: number;
  prevProfit: number;
  hasData: boolean;
  rangeLabel: string;
}

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const pad2 = (n: number) => String(n).padStart(2, '0');

// Início/fim do período do gráfico para uma data âncora e um escopo (semana começa na segunda).
export const getChartRange = (anchor: Date, scope: ChartScope): { start: Date; end: Date } => {
  const d = startOfDay(anchor);
  if (scope === 'dia') return { start: d, end: endOfDay(d) };
  if (scope === 'semana') {
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday, end: endOfDay(sunday) };
  }
  if (scope === 'mes') {
    return { start: new Date(d.getFullYear(), d.getMonth(), 1), end: endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
  }
  return { start: new Date(d.getFullYear(), 0, 1), end: endOfDay(new Date(d.getFullYear(), 11, 31)) };
};

// Move a âncora para o período anterior (-1) ou seguinte (+1) do escopo.
export const shiftChartAnchor = (anchor: Date, scope: ChartScope, dir: -1 | 1): Date => {
  const d = new Date(anchor);
  if (scope === 'dia') d.setDate(d.getDate() + dir);
  else if (scope === 'semana') d.setDate(d.getDate() + 7 * dir);
  else if (scope === 'mes') { d.setDate(1); d.setMonth(d.getMonth() + dir); }
  else { d.setDate(1); d.setFullYear(d.getFullYear() + dir); }
  return d;
};

const sumSales = (sales: Sale[]) => ({
  sales: sales.reduce((a, s) => a + s.totalAmount, 0),
  profit: sales.reduce((a, s) => a + (s.totalAmount - (s.totalCost ?? 0)), 0),
});

export const buildChartSeries = (
  allSales: Sale[],
  anchor: Date,
  scope: ChartScope,
  now: Date = new Date(),
): ChartSeries => {
  const active = allSales.filter(isSaleActive);
  const { start, end } = getChartRange(anchor, scope);
  const inRange = active.filter(s => isInRange(new Date(s.createdAt), start, end));

  // Período anterior equivalente (dia→dia anterior, mês→mês anterior, ano→ano anterior...)
  const prev = getChartRange(shiftChartAnchor(anchor, scope, -1), scope);
  const prevSalesList = active.filter(s => isInRange(new Date(s.createdAt), prev.start, prev.end));
  const prevTotals = sumSales(prevSalesList);
  const totals = sumSales(inRange);

  const points: ChartPoint[] = [];
  const bucket = (idx: number, s: Sale) => {
    points[idx].sales += s.totalAmount;
    points[idx].profit += s.totalAmount - (s.totalCost ?? 0);
  };

  if (inRange.length > 0) {
    if (scope === 'dia') {
      for (let h = 0; h < 24; h++) points.push({ label: `${pad2(h)}h`, tooltipLabel: `${pad2(h)}h às ${pad2(h)}h59`, sales: 0, profit: 0 });
      inRange.forEach(s => bucket(new Date(s.createdAt).getHours(), s));
    } else if (scope === 'semana' || scope === 'mes') {
      const days = Math.round((startOfDay(end).getTime() - start.getTime()) / MS_PER_DAY) + 1;
      for (let i = 0; i < days; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const dm = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
        points.push({
          label: scope === 'semana' ? WEEKDAY_SHORT[i] : pad2(d.getDate()),
          tooltipLabel: `${WEEKDAY_SHORT[(d.getDay() + 6) % 7]}, ${dm}/${d.getFullYear()}`,
          sales: 0, profit: 0,
        });
      }
      inRange.forEach(s => bucket(Math.floor((startOfDay(new Date(s.createdAt)).getTime() - start.getTime()) / MS_PER_DAY + 0.5), s));
    } else {
      // Ano: começa no primeiro mês com venda real e termina no último mês com venda (ou no mês atual).
      const months = inRange.map(s => new Date(s.createdAt).getMonth());
      const first = Math.min(...months);
      const last = start.getFullYear() === now.getFullYear() ? Math.max(Math.max(...months), now.getMonth()) : Math.max(...months);
      for (let m = first; m <= last; m++) points.push({ label: MONTH_SHORT[m], tooltipLabel: `${MONTH_SHORT[m]} ${start.getFullYear()}`, sales: 0, profit: 0 });
      inRange.forEach(s => bucket(new Date(s.createdAt).getMonth() - first, s));
    }
  }

  const fmt = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  const rangeLabel =
    scope === 'dia' ? fmt(start)
      : scope === 'semana' ? `${fmt(start)} a ${fmt(end)}`
        : scope === 'mes' ? `${MONTH_SHORT[start.getMonth()]} ${start.getFullYear()}`
          : String(start.getFullYear());

  return {
    points,
    totalSales: totals.sales,
    totalProfit: totals.profit,
    prevSales: prevTotals.sales,
    prevProfit: prevTotals.profit,
    hasData: inRange.length > 0,
    rangeLabel,
  };
};
