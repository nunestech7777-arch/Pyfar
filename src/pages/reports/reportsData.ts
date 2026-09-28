import { Sale, SaleItem, VaccineBatch, PaymentMethod, PaymentStatus } from '../../types';

// ============================================================================
// PERÍODO
// ============================================================================

export type PeriodPreset = 'hoje' | 'ontem' | '7d' | '30d' | 'mes_atual' | 'mes_anterior' | 'personalizado';

export interface ReportsFilters {
  period: PeriodPreset;
  customStart?: string; // YYYY-MM-DD
  customEnd?: string; // YYYY-MM-DD
  productName?: string;
  clientId?: string;
  batchId?: string;
  commissionerId?: string;
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
}

export const defaultFilters: ReportsFilters = { period: '30d' };

const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };
const endOfDay = (d: Date) => { const c = new Date(d); c.setHours(23, 59, 59, 999); return c; };

// Retorna [inicio, fim] (inclusive) do período selecionado, e o intervalo imediatamente
// anterior de mesma duração (usado para o comparativo "+X% em relação ao período anterior").
export const getPeriodRange = (filters: ReportsFilters): { start: Date; end: Date; prevStart: Date; prevEnd: Date } => {
  const today = startOfDay(new Date());

  if (filters.period === 'hoje') {
    const start = today;
    const end = endOfDay(today);
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1);
    const prevEnd = endOfDay(prevStart);
    return { start, end, prevStart, prevEnd };
  }
  if (filters.period === 'ontem') {
    const start = new Date(today); start.setDate(start.getDate() - 1);
    const end = endOfDay(start);
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1);
    const prevEnd = endOfDay(prevStart);
    return { start, end, prevStart, prevEnd };
  }
  if (filters.period === '7d') {
    const start = new Date(today); start.setDate(start.getDate() - 6);
    const end = endOfDay(today);
    const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 6);
    return { start, end, prevStart, prevEnd: endOfDay(prevEnd) };
  }
  if (filters.period === '30d') {
    const start = new Date(today); start.setDate(start.getDate() - 29);
    const end = endOfDay(today);
    const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 29);
    return { start, end, prevStart, prevEnd: endOfDay(prevEnd) };
  }
  if (filters.period === 'mes_atual') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = endOfDay(today);
    const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    return { start, end, prevStart, prevEnd };
  }
  if (filters.period === 'mes_anterior') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    const prevStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const prevEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0, 23, 59, 59, 999);
    return { start, end, prevStart, prevEnd };
  }

  // personalizado
  const start = filters.customStart ? startOfDay(new Date(filters.customStart)) : startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
  const end = filters.customEnd ? endOfDay(new Date(filters.customEnd)) : endOfDay(today);
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { start, end, prevStart, prevEnd };
};

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  '7d': '7 dias',
  '30d': '30 dias',
  mes_atual: 'Este mês',
  mes_anterior: 'Mês anterior',
  personalizado: 'Personalizado',
};

// ============================================================================
// FILTRAGEM DE VENDAS
// ============================================================================

export const saleMatchesDimensionFilters = (sale: Sale, filters: ReportsFilters): boolean => {
  if (filters.clientId && sale.clientId !== filters.clientId) return false;
  if (filters.commissionerId && sale.commissionerId !== filters.commissionerId) return false;
  if (filters.paymentMethod && sale.paymentMethod !== filters.paymentMethod) return false;
  if (filters.status && sale.status !== filters.status) return false;
  if (filters.productName && !sale.items.some(it => it.vaccineName === filters.productName)) return false;
  if (filters.batchId && !sale.items.some(it => it.batchId === filters.batchId)) return false;
  return true;
};

export const filterSalesByRange = (sales: Sale[], start: Date, end: Date, filters: ReportsFilters): Sale[] => {
  return sales.filter(s => {
    if (s.status === 'cancelado') return false;
    const createdAt = new Date(s.createdAt);
    if (createdAt < start || createdAt > end) return false;
    return saleMatchesDimensionFilters(s, filters);
  });
};

// ============================================================================
// TOTAIS (RECONCILIÁVEIS: vendas = recebido + a receber, sempre)
// ============================================================================

export interface ReportsTotals {
  vendas: number;
  recebido: number;
  aReceber: number;
  custo: number;
  lucro: number;
  margem: number;
  unidades: number;
  salesCount: number;
}

export const computeTotals = (sales: Sale[]): ReportsTotals => {
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

export const percentChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current === 0 ? 0 : null; // sem base de comparação
  return ((current - previous) / Math.abs(previous)) * 100;
};

// ============================================================================
// ITEM-LEVEL ALLOCATION (evita duplicação de faturamento/pagamento em vendas com
// múltiplos itens: cada item recebe uma fatia proporcional de paidAmount/remainingBalance)
// ============================================================================

export interface AllocatedItem {
  sale: Sale;
  item: SaleItem;
  itemPaid: number;
  itemRemaining: number;
}

export const allocateItems = (sales: Sale[]): AllocatedItem[] => {
  const result: AllocatedItem[] = [];
  for (const sale of sales) {
    for (const item of sale.items) {
      const share = sale.totalAmount > 0 ? item.totalPrice / sale.totalAmount : 0;
      result.push({
        sale,
        item,
        itemPaid: sale.paidAmount * share,
        itemRemaining: sale.remainingBalance * share,
      });
    }
  }
  return result;
};

// ============================================================================
// RESUMO POR PRODUTO (dinâmico, por VaccineBatch.vaccineName / SaleItem.vaccineName)
// ============================================================================

export interface ProductSummary {
  name: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  paid: number;
  remaining: number;
  salesCount: number;
  currentStock: number;
  allocations: AllocatedItem[];
}

export const computeProductSummaries = (sales: Sale[], batches: VaccineBatch[]): ProductSummary[] => {
  const allocations = allocateItems(sales);
  const productNames = new Set<string>([...batches.map(b => b.vaccineName), ...allocations.map(a => a.item.vaccineName)]);

  return Array.from(productNames).map(name => {
    const productAllocations = allocations.filter(a => a.item.vaccineName === name);
    const salesIds = new Set(productAllocations.map(a => a.sale.id));
    return {
      name,
      unitsSold: productAllocations.reduce((acc, a) => acc + a.item.quantity, 0),
      revenue: productAllocations.reduce((acc, a) => acc + a.item.totalPrice, 0),
      cost: productAllocations.reduce((acc, a) => acc + a.item.totalCost, 0),
      profit: productAllocations.reduce((acc, a) => acc + a.item.grossProfit, 0),
      paid: productAllocations.reduce((acc, a) => acc + a.itemPaid, 0),
      remaining: productAllocations.reduce((acc, a) => acc + a.itemRemaining, 0),
      salesCount: salesIds.size,
      currentStock: batches.filter(b => b.vaccineName === name).reduce((acc, b) => acc + b.currentQuantity, 0),
      allocations: productAllocations,
    };
  }).sort((a, b) => b.revenue - a.revenue);
};

// ============================================================================
// RESUMO POR LOTE
// ============================================================================

export interface LotSummary {
  batch: VaccineBatch;
  sold: number;
  revenue: number;
  cost: number;
  profit: number;
  paid: number;
  remaining: number;
  allocations: AllocatedItem[];
}

export const computeLotSummaries = (sales: Sale[], batches: VaccineBatch[]): LotSummary[] => {
  const allocations = allocateItems(sales);
  return batches.map(batch => {
    const lotAllocations = allocations.filter(a => a.item.batchId === batch.id);
    return {
      batch,
      sold: lotAllocations.reduce((acc, a) => acc + a.item.quantity, 0),
      revenue: lotAllocations.reduce((acc, a) => acc + a.item.totalPrice, 0),
      cost: lotAllocations.reduce((acc, a) => acc + a.item.totalCost, 0),
      profit: lotAllocations.reduce((acc, a) => acc + a.item.grossProfit, 0),
      paid: lotAllocations.reduce((acc, a) => acc + a.itemPaid, 0),
      remaining: lotAllocations.reduce((acc, a) => acc + a.itemRemaining, 0),
      allocations: lotAllocations,
    };
  });
};
