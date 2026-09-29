import React, { useState, useMemo } from 'react';
import { toLocalISODate, getEffectiveSaleStatus } from '../utils/financeRules';
import { Download, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, getPaymentStatusBadge } from '../utils/formatters';
import { PeriodFilterBar } from './reports/PeriodFilterBar';
import { OverviewTab } from './reports/OverviewTab';
import { ProductsTab } from './reports/ProductsTab';
import { LotsTab } from './reports/LotsTab';
import { SalesTab } from './reports/SalesTab';
import { ReceivablesTab } from './reports/ReceivablesTab';
import { ReportsDetailDrawer, ReportsDrawerType } from './reports/ReportsDetailDrawer';
import {
  ReportsFilters, defaultFilters, getPeriodRange, filterSalesByRange,
  computeTotals, computeProductSummaries, computeLotSummaries, saleMatchesDimensionFilters,
} from './reports/reportsData';
import { ProductSummary, LotSummary } from './reports/reportsData';
import { Sale } from '../types';
import { RecordPaymentModal } from '../components/modals/RecordPaymentModal';

type ReportsTab = 'visao_geral' | 'produtos' | 'lotes' | 'vendas' | 'a_receber';

export const ReportsPage: React.FC = () => {
  const { sales, batches, setViewingReceiptSale } = useApp();

  const [tab, setTab] = useState<ReportsTab>('visao_geral');
  const [filters, setFilters] = useState<ReportsFilters>(defaultFilters);
  const [saleForPayment, setSaleForPayment] = useState<Sale | null>(null);

  const [drawer, setDrawer] = useState<{ type: ReportsDrawerType; data?: any } | null>(null);

  // ---------------------------------------------------------------------
  // Camada de dados: única fonte de verdade para todas as abas (evita
  // duplicar lógica de cálculo entre Visão Geral / Produtos / Lotes / Vendas).
  // ---------------------------------------------------------------------
  const { filteredSales, totals, previousTotals, productSummaries, lotSummaries, receivablesSales } = useMemo(() => {
    const { start, end, prevStart, prevEnd } = getPeriodRange(filters);
    const filteredSales = filterSalesByRange(sales, start, end, filters);
    const previousSales = filterSalesByRange(sales, prevStart, prevEnd, filters);
    const receivablesSales = sales.filter(s => saleMatchesDimensionFilters(s, filters));

    return {
      filteredSales,
      totals: computeTotals(filteredSales),
      previousTotals: computeTotals(previousSales),
      productSummaries: computeProductSummaries(filteredSales, batches),
      lotSummaries: computeLotSummaries(filteredSales, batches),
      receivablesSales,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, batches, filters]);

  const openDrawer = (type: ReportsDrawerType, data?: any) => setDrawer({ type, data });
  const closeDrawer = () => setDrawer(null);

  const openProduct = (p: ProductSummary) => openDrawer('product_detail', p);
  const openLot = (l: LotSummary) => openDrawer('lot_detail', l);
  const openSale = (s: Sale) => openDrawer('sale_detail', s);

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'Data,Pedido,Cliente,Produto,Quantidade,Custo,Faturamento,Lucro,Pago,Falta Receber,Status\n';
    filteredSales.forEach(s => {
      const productLabel = Array.from(new Set(s.items.map(i => i.vaccineName))).join(' + ');
      csv += `"${s.createdAt}","${s.saleNumber}","${s.clientName}","${productLabel}",${s.totalQuantity},${s.totalCost},${s.totalAmount},${s.grossProfit},${s.paidAmount},${s.remainingBalance},"${getPaymentStatusBadge(getEffectiveSaleStatus(s)).label}"\n`;
    });
    const uri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', uri);
    link.setAttribute('download', `relatorio_vendas_${toLocalISODate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => window.print();

  const TABS: { id: ReportsTab; label: string }[] = [
    { id: 'visao_geral', label: 'Visão Geral' },
    { id: 'produtos', label: 'Produtos' },
    { id: 'lotes', label: 'Lotes' },
    { id: 'vendas', label: 'Vendas' },
    { id: 'a_receber', label: 'A Receber' },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">

      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Relatórios</h1>
            <span className="text-xs font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              {totals.salesCount} vendas no período
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Vendas: {formatCurrency(totals.vendas)} • Recebido: {formatCurrency(totals.recebido)} • Lucro: {formatCurrency(totals.lucro)}
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95">
            <Download className="w-4 h-4" />
            <span>Exportar CSV / Excel</span>
          </button>
          <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-blue-glow transition-all flex items-center gap-2 active:scale-95">
            <Printer className="w-4 h-4" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Filtro de Período */}
      <div className="no-print">
        <PeriodFilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* Navegação Principal */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-card flex items-center gap-1.5 overflow-x-auto no-print">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da Aba */}
      {tab === 'visao_geral' && (
        <OverviewTab
          totals={totals}
          previousTotals={previousTotals}
          productSummaries={productSummaries}
          filteredSales={filteredSales}
          onOpenCard={(type) => openDrawer(type)}
          onOpenProduct={openProduct}
        />
      )}
      {tab === 'produtos' && <ProductsTab productSummaries={productSummaries} onOpenProduct={openProduct} />}
      {tab === 'lotes' && <LotsTab lotSummaries={lotSummaries} onOpenLot={openLot} />}
      {tab === 'vendas' && <SalesTab sales={filteredSales} onOpenSale={openSale} />}
      {tab === 'a_receber' && <ReceivablesTab sales={receivablesSales} onOpenSale={openSale} />}

      {/* Drawer de Detalhamento */}
      {drawer && (
        <ReportsDetailDrawer
          isOpen={!!drawer}
          onClose={closeDrawer}
          initialType={drawer.type}
          initialData={drawer.data}
          filteredSales={filteredSales}
          lotSummaries={lotSummaries}
          onOpenRecordPayment={(sale) => setSaleForPayment(sale)}
          onOpenReceipt={(sale) => setViewingReceiptSale(sale)}
        />
      )}

      {/* Registrar Pagamento a partir do drawer de relatórios */}
      <RecordPaymentModal
        isOpen={!!saleForPayment}
        onClose={() => setSaleForPayment(null)}
        sale={saleForPayment}
      />
    </div>
  );
};
