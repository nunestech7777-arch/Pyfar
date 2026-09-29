import type { Sale, SaleItem, VaccineBatch, PaymentMethod, PaymentStatus } from '../../types';
import {
  PeriodPreset, PeriodSelection, PeriodRange, getPeriodRange as getSharedPeriodRange,
  filterSalesInRange, computeSalesTotals, SalesTotals, getEffectiveSaleStatus,
} from '../../utils/financeRules';

// Período, totais e status vêm de utils/financeRules.ts (mesmas regras do Financeiro).
export type { PeriodPreset } from '../../utils/financeRules';
export { PERIOD_LABELS } from '../../utils/financeRules';

// ============================================================================
// FILTROS DOS RELATÓRIOS
// ============================================================================

export interface ReportsFilters extends PeriodSelection {
  productName?: string;
  clientId?: string;
  batchId?: string;
  commissionerId?: string;
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
}

export const defaultFilters: ReportsFilters = { period: '30d' };

export const REPORTS_PERIOD_OPTIONS: PeriodPreset[] = ['hoje', 'ontem', '7d', '30d', 'mes_atual', 'mes_anterior', 'personalizado'];

export const getPeriodRange = (filters: ReportsFilters): PeriodRange => getSharedPeriodRange(filters);

// ============================================================================
// FILTRAGEM DE VENDAS
// ============================================================================

export const saleMatchesDimensionFilters = (sale: Sale, filters: ReportsFilters): boolean => {
  if (filters.clientId && sale.clientId !== filters.clientId) return false;
  if (filters.commissionerId && sale.commissionerId !== filters.commissionerId) return false;
  if (filters.paymentMethod && sale.paymentMethod !== filters.paymentMethod) return false;
  if (filters.status && getEffectiveSaleStatus(sale) !== filters.status) return false;
  if (filters.productName && !sale.items.some(it => it.vaccineName === filters.productName)) return false;
  if (filters.batchId && !sale.items.some(it => it.batchId === filters.batchId)) return false;
  return true;
};

export const filterSalesByRange = (sales: Sale[], start: Date, end: Date, filters: ReportsFilters): Sale[] =>
  filterSalesInRange(sales, start, end).filter(s => saleMatchesDimensionFilters(s, filters));

// ============================================================================
// TOTAIS (RECONCILIÁVEIS: vendas = recebido + a receber, sempre)
// ============================================================================

export type ReportsTotals = SalesTotals;
export const computeTotals = computeSalesTotals;

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
