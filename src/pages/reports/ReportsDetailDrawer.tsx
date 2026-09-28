import React, { useState } from 'react';
import {
  X, ArrowLeft, Search, ChevronRight, CreditCard, Receipt,
  ShieldCheck, Phone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatCurrency, formatDate, getPaymentStatusBadge, getPaymentMethodLabel,
} from '../../utils/formatters';
import { Sale, Client } from '../../types';
import { ProductSummary, LotSummary } from './reportsData';

export type ReportsDrawerType =
  | 'sales_overview'
  | 'received_overview'
  | 'receivable_overview'
  | 'cost_overview'
  | 'profit_overview'
  | 'product_detail'
  | 'lot_detail'
  | 'sale_detail'
  | 'client_detail';

interface DrawerStep {
  type: ReportsDrawerType;
  title: string;
  data?: any;
}

interface ReportsDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: ReportsDrawerType;
  initialData?: any;
  filteredSales: Sale[];
  lotSummaries: LotSummary[];
  onOpenRecordPayment: (sale: Sale) => void;
  onOpenReceipt: (sale: Sale) => void;
}

export const ReportsDetailDrawer: React.FC<ReportsDetailDrawerProps> = ({
  isOpen, onClose, initialType, initialData, filteredSales, lotSummaries,
  onOpenRecordPayment, onOpenReceipt,
}) => {
  const { sales, payments, clients } = useApp();
  const [history, setHistory] = useState<DrawerStep[]>([]);
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      const titles: Record<ReportsDrawerType, string> = {
        sales_overview: 'Detalhamento de Vendas',
        received_overview: 'Detalhamento do Recebido',
        receivable_overview: 'Detalhamento do A Receber',
        cost_overview: 'Detalhamento do Custo',
        profit_overview: 'Detalhamento do Lucro',
        product_detail: initialData?.name ? `Produto: ${initialData.name}` : 'Produto',
        lot_detail: initialData?.batch ? `Lote: ${initialData.batch.lotNumber}` : 'Lote',
        sale_detail: initialData?.saleNumber ? `Venda ${initialData.saleNumber}` : 'Venda',
        client_detail: initialData?.name ? `Cliente: ${initialData.name}` : 'Cliente',
      };
      setHistory([{ type: initialType, title: titles[initialType], data: initialData }]);
      setSearch('');
    }
  }, [isOpen, initialType, initialData]);

  if (!isOpen || history.length === 0) return null;
  const current = history[history.length - 1];

  const push = (step: DrawerStep) => { setHistory(prev => [...prev, step]); setSearch(''); };
  const pop = () => { if (history.length > 1) { setHistory(prev => prev.slice(0, -1)); setSearch(''); } };

  const openSale = (sale: Sale) => push({ type: 'sale_detail', title: `Venda ${sale.saleNumber}`, data: sale });
  const openClient = (client: Client) => push({ type: 'client_detail', title: `Cliente: ${client.name}`, data: client });

  const matchesSearch = (s: Sale) =>
    s.clientName.toLowerCase().includes(search.toLowerCase()) || s.saleNumber.toLowerCase().includes(search.toLowerCase());

  // ---------------------------------------------------------------
  // Renderiza uma linha de venda simples (reutilizada pelas listas de overview)
  // ---------------------------------------------------------------
  const SaleRow: React.FC<{ sale: Sale; highlight?: 'paid' | 'remaining' }> = ({ sale, highlight }) => {
    const badge = getPaymentStatusBadge(sale.status);
    const productLabel = Array.from(new Set(sale.items.map(i => i.vaccineName))).join(' + ');
    return (
      <div
        onClick={() => openSale(sale)}
        className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-blue-600 text-xs">{sale.saleNumber}</span>
            <span className="text-slate-300">•</span>
            <span className="font-black text-slate-900 text-sm truncate">{sale.clientName}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>{badge.label}</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
            <span>{formatDate(sale.createdAt)}</span>
            <span className="truncate max-w-[200px]">{productLabel}</span>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Valor</div>
            <div className={`text-sm font-black ${highlight === 'remaining' ? 'text-rose-600' : highlight === 'paid' ? 'text-emerald-600' : 'text-slate-900'}`}>
              {highlight === 'paid' ? formatCurrency(sale.paidAmount) : highlight === 'remaining' ? formatCurrency(sale.remainingBalance) : formatCurrency(sale.totalAmount)}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200 no-print">
      <div onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">

          {/* Header */}
          <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {history.length > 1 ? (
                  <button onClick={pop} className="p-1.5 -ml-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-1 text-xs font-bold active:scale-95">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                )}
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">{current.title}</h2>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">

            {/* Vendas / Custo / Lucro overview: mesma lista, colunas diferentes de destaque */}
            {(current.type === 'sales_overview' || current.type === 'cost_overview' || current.type === 'profit_overview') && (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente ou venda..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                </div>
                <div className="space-y-2.5">
                  {filteredSales.filter(matchesSearch).map(sale => <SaleRow key={sale.id} sale={sale} />)}
                  {filteredSales.length === 0 && <EmptyState text="Nenhuma venda no período selecionado." />}
                </div>
              </>
            )}

            {/* Recebido */}
            {current.type === 'received_overview' && (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente ou venda..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                </div>
                <div className="space-y-2.5">
                  {filteredSales.filter(s => s.paidAmount > 0).filter(matchesSearch).map(sale => <SaleRow key={sale.id} sale={sale} highlight="paid" />)}
                  {filteredSales.filter(s => s.paidAmount > 0).length === 0 && <EmptyState text="Nenhum valor recebido no período." />}
                </div>
              </>
            )}

            {/* A Receber */}
            {current.type === 'receivable_overview' && (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente ou venda..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                </div>
                <div className="space-y-2.5">
                  {filteredSales.filter(s => s.remainingBalance > 0).filter(matchesSearch).map(sale => <SaleRow key={sale.id} sale={sale} highlight="remaining" />)}
                  {filteredSales.filter(s => s.remainingBalance > 0).length === 0 && <EmptyState text="Nada a receber no período." good />}
                </div>
              </>
            )}

            {/* Detalhe de Produto */}
            {current.type === 'product_detail' && current.data && (() => {
              const p: ProductSummary = current.data;
              const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
              const ticket = p.salesCount > 0 ? p.revenue / p.salesCount : 0;
              const relatedSaleIds = Array.from(new Set(p.allocations.map(a => a.sale.id)));
              const relatedSales = relatedSaleIds.map(id => sales.find(s => s.id === id)).filter(Boolean) as Sale[];
              const relatedLots = lotSummaries.filter(l => p.allocations.some(a => a.item.batchId === l.batch.id) || l.batch.vaccineName === p.name);

              // top clientes por receita deste produto
              const byClient: Record<string, { name: string; revenue: number; units: number }> = {};
              p.allocations.forEach(a => {
                const key = a.sale.clientId;
                if (!byClient[key]) byClient[key] = { name: a.sale.clientName, revenue: 0, units: 0 };
                byClient[key].revenue += a.item.totalPrice;
                byClient[key].units += a.item.quantity;
              });
              const topClients = Object.values(byClient).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

              return (
                <div className="space-y-5">
                  <MetricGrid items={[
                    { label: 'Vendido', value: `${p.unitsSold} un` },
                    { label: 'Faturamento', value: formatCurrency(p.revenue) },
                    { label: 'Custo', value: formatCurrency(p.cost), tone: 'rose' },
                    { label: 'Lucro', value: formatCurrency(p.profit), tone: 'emerald', sub: `${margin.toFixed(1)}% margem` },
                    { label: 'Recebido', value: formatCurrency(p.paid), tone: 'emerald' },
                    { label: 'A Receber', value: formatCurrency(p.remaining), tone: 'amber' },
                    { label: 'Estoque Atual', value: `${p.currentStock} un` },
                    { label: 'Ticket Médio', value: formatCurrency(ticket) },
                  ]} />

                  {topClients.length > 0 && (
                    <Section title="Principais Clientes">
                      {topClients.map(c => (
                        <div key={c.name} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 text-xs">
                          <span className="font-bold text-slate-800">{c.name}</span>
                          <span className="text-slate-500">{c.units} un — <strong className="text-slate-900">{formatCurrency(c.revenue)}</strong></span>
                        </div>
                      ))}
                    </Section>
                  )}

                  {relatedLots.length > 0 && (
                    <Section title="Lotes Relacionados">
                      {relatedLots.map(l => (
                        <div key={l.batch.id} onClick={() => push({ type: 'lot_detail', title: `Lote: ${l.batch.lotNumber}`, data: l })}
                          className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 hover:border-blue-300 cursor-pointer text-xs">
                          <span className="font-mono font-bold text-slate-800">{l.batch.lotNumber}</span>
                          <span className="text-slate-500">{l.batch.currentQuantity} un restantes</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      ))}
                    </Section>
                  )}

                  <Section title={`Vendas Relacionadas (${relatedSales.length})`}>
                    {relatedSales.map(s => <SaleRow key={s.id} sale={s} />)}
                  </Section>
                </div>
              );
            })()}

            {/* Detalhe de Lote */}
            {current.type === 'lot_detail' && current.data && (() => {
              const l: LotSummary = current.data;
              const b = l.batch;
              const invested = b.initialQuantity * b.unitCost;
              const remaining = b.currentQuantity;
              const margin = l.revenue > 0 ? (l.profit / l.revenue) * 100 : 0;
              const avgSalePrice = l.sold > 0 ? l.revenue / l.sold : 0;
              const relatedSaleIds = Array.from(new Set(l.allocations.map(a => a.sale.id)));
              const relatedSales = relatedSaleIds.map(id => sales.find(s => s.id === id)).filter(Boolean) as Sale[];

              return (
                <div className="space-y-5">
                  <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1.5">
                    <div className="text-xs text-slate-400">{b.vaccineName} • {b.manufacturer}</div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-400">Fornecedor:</span>
                      <strong className="text-white">{b.supplier || '—'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Entrada:</span>
                      <strong className="text-white">{formatDate(b.entryDate)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Custo Unitário:</span>
                      <strong className="text-white">{formatCurrency(b.unitCost)}</strong>
                    </div>
                  </div>

                  <MetricGrid items={[
                    { label: 'Comprado', value: `${b.initialQuantity} un` },
                    { label: 'Vendido', value: `${l.sold} un` },
                    { label: 'Restante', value: `${remaining} un` },
                    { label: 'Investimento', value: formatCurrency(invested) },
                    { label: 'Faturamento', value: formatCurrency(l.revenue) },
                    { label: 'Lucro', value: formatCurrency(l.profit), tone: 'emerald', sub: `${margin.toFixed(1)}% margem` },
                    { label: 'Recebido', value: formatCurrency(l.paid), tone: 'emerald' },
                    { label: 'A Receber', value: formatCurrency(l.remaining), tone: 'amber' },
                    { label: 'Preço Médio Venda', value: formatCurrency(avgSalePrice) },
                  ]} />

                  <Section title={`Vendas Relacionadas (${relatedSales.length})`}>
                    {relatedSales.map(s => <SaleRow key={s.id} sale={s} />)}
                    {relatedSales.length === 0 && <EmptyState text="Nenhuma venda deste lote no período selecionado." />}
                  </Section>
                </div>
              );
            })()}

            {/* Detalhe de Venda */}
            {current.type === 'sale_detail' && current.data && (() => {
              const sale: Sale = current.data;
              const margin = sale.totalAmount > 0 ? (sale.grossProfit / sale.totalAmount) * 100 : 0;
              const badge = getPaymentStatusBadge(sale.status);
              const salePayments = payments.filter(p => p.saleId === sale.id).sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
              const client = clients.find(c => c.id === sale.clientId);

              return (
                <div className="space-y-5">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-blue-600 text-sm">{sale.saleNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>{badge.label}</span>
                        </div>
                        <h3 onClick={() => client && openClient(client)} className={`text-base sm:text-lg font-black text-slate-900 mt-1 ${client ? 'cursor-pointer hover:text-blue-600' : ''}`}>
                          {sale.clientName}
                        </h3>
                        {sale.storeName && <span className="text-xs text-slate-500">{sale.storeName}</span>}
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button onClick={() => onOpenReceipt(sale)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5" /><span>Comprovante</span>
                        </button>
                        {sale.remainingBalance > 0 && (
                          <button onClick={() => onOpenRecordPayment(sale)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95">
                            <CreditCard className="w-3.5 h-3.5" /><span>Registrar Pagt.</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <MiniStat label="Valor Total" value={formatCurrency(sale.totalAmount)} />
                      <MiniStat label="Custo" value={formatCurrency(sale.totalCost)} tone="rose" />
                      <MiniStat label="Lucro" value={formatCurrency(sale.grossProfit)} tone="emerald" sub={`${margin.toFixed(1)}% margem`} />
                      <MiniStat label="Falta Receber" value={formatCurrency(sale.remainingBalance)} tone={sale.remainingBalance > 0 ? 'amber' : 'emerald'} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span>Data: <strong>{formatDate(sale.createdAt)}</strong></span>
                      <span>Forma: <strong>{getPaymentMethodLabel(sale.paymentMethod)}</strong></span>
                      <span>Vencimento: <strong>{formatDate(sale.dueDate)}</strong></span>
                      {sale.commissionerName && <span>Vendedor: <strong className="text-blue-600">{sale.commissionerName}</strong></span>}
                    </div>
                  </div>

                  <Section title={`Produtos Vendidos (${sale.items.length})`}>
                    {sale.items.map((item, idx) => (
                      <div key={item.id || idx} className="bg-white p-3.5 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{item.vaccineName}</span>
                            <span className="ml-2 font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">Lote: {item.lotNumber}</span>
                          </div>
                          <span className="font-black text-slate-900 text-xs sm:text-sm">{formatCurrency(item.totalPrice)}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl text-[11px] border border-slate-100">
                          <div><span className="text-[10px] text-slate-400 block">Qtd</span><strong>{item.quantity} un</strong></div>
                          <div><span className="text-[10px] text-slate-400 block">Preço Unit.</span><strong>{formatCurrency(item.unitPrice)}</strong></div>
                          <div><span className="text-[10px] text-slate-400 block">Custo Unit.</span><strong className="text-rose-600">{formatCurrency(item.unitCost)}</strong></div>
                          <div className="text-right"><span className="text-[10px] text-slate-400 block">Lucro</span><strong className="text-emerald-600">+{formatCurrency(item.grossProfit)}</strong></div>
                        </div>
                      </div>
                    ))}
                  </Section>

                  <Section title="Histórico de Pagamentos">
                    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
                      {salePayments.length === 0 ? (
                        <div className="p-4 text-xs text-slate-400 text-center">Nenhum pagamento registrado ainda.</div>
                      ) : salePayments.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 text-xs">
                          <div>
                            <div className="font-bold text-slate-800">{formatDate(p.paymentDate)}</div>
                            <div className="text-[10px] text-slate-400">{getPaymentMethodLabel(p.paymentMethod)}{p.notes ? ` • ${p.notes}` : ''}</div>
                          </div>
                          <span className="font-black text-emerald-600">+{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-3 bg-slate-50 text-xs font-bold">
                        <span className="text-slate-600">Total Recebido</span>
                        <span className="text-emerald-600">{formatCurrency(sale.paidAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 text-xs font-bold">
                        <span className="text-slate-600">Falta Receber</span>
                        <span className={sale.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>{formatCurrency(sale.remainingBalance)}</span>
                      </div>
                    </div>
                  </Section>
                </div>
              );
            })()}

            {/* Detalhe de Cliente */}
            {current.type === 'client_detail' && current.data && (() => {
              const client: Client = current.data;
              const clientSales = sales.filter(s => s.clientId === client.id && s.status !== 'cancelado');
              const totalSpent = clientSales.reduce((a, s) => a + s.totalAmount, 0);
              const totalPaid = clientSales.reduce((a, s) => a + s.paidAmount, 0);
              const totalOpen = clientSales.reduce((a, s) => a + s.remainingBalance, 0);
              const totalProfit = clientSales.reduce((a, s) => a + s.grossProfit, 0);
              const ticket = clientSales.length > 0 ? totalSpent / clientSales.length : 0;
              const lastSale = [...clientSales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
              const productsBought = Array.from(new Set(clientSales.flatMap(s => s.items.map(i => i.vaccineName))));
              const pendingSales = clientSales.filter(s => s.remainingBalance > 0);

              return (
                <div className="space-y-5">
                  <div className="bg-slate-900 text-white p-4 rounded-2xl">
                    <div className="text-sm font-black">{client.name}</div>
                    {client.storeName && <div className="text-xs text-slate-400">{client.storeName}</div>}
                    {client.phone && <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1"><Phone className="w-3 h-3" />{client.phone}</div>}
                  </div>

                  <MetricGrid items={[
                    { label: 'Total Comprado', value: formatCurrency(totalSpent) },
                    { label: 'Nº de Compras', value: `${clientSales.length}` },
                    { label: 'Total Pago', value: formatCurrency(totalPaid), tone: 'emerald' },
                    { label: 'Saldo em Aberto', value: formatCurrency(totalOpen), tone: totalOpen > 0 ? 'amber' : 'emerald' },
                    { label: 'Lucro Gerado', value: formatCurrency(totalProfit), tone: 'emerald' },
                    { label: 'Ticket Médio', value: formatCurrency(ticket) },
                    { label: 'Última Compra', value: lastSale ? formatDate(lastSale.createdAt) : '—' },
                    { label: 'Vendas Pendentes', value: `${pendingSales.length}` },
                  ]} />

                  {productsBought.length > 0 && (
                    <Section title="Produtos Comprados">
                      <div className="flex flex-wrap gap-1.5">
                        {productsBought.map(p => (
                          <span key={p} className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold px-2.5 py-1 rounded-full">{p}</span>
                        ))}
                      </div>
                    </Section>
                  )}

                  <Section title={`Histórico de Vendas (${clientSales.length})`}>
                    {clientSales.map(s => <SaleRow key={s.id} sale={s} />)}
                  </Section>
                </div>
              );
            })()}
          </div>

          {/* Footer */}
          <div className="bg-white p-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Dados 100% integrados em tempo real</span>
            </div>
            <button onClick={onClose} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Subcomponentes de apoio
// ---------------------------------------------------------------------------

const toneClasses: Record<string, string> = {
  default: 'text-slate-900',
  emerald: 'text-emerald-600',
  rose: 'text-rose-600',
  amber: 'text-amber-600',
};

const MetricGrid: React.FC<{ items: Array<{ label: string; value: string; tone?: string; sub?: string }> }> = ({ items }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
    {items.map(it => (
      <div key={it.label} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
        <span className="text-[10px] font-bold text-slate-400 uppercase block">{it.label}</span>
        <div className={`text-sm sm:text-base font-black mt-0.5 ${toneClasses[it.tone || 'default']}`}>{it.value}</div>
        {it.sub && <span className="text-[10px] text-slate-400">{it.sub}</span>}
      </div>
    ))}
  </div>
);

const MiniStat: React.FC<{ label: string; value: string; tone?: string; sub?: string }> = ({ label, value, tone, sub }) => (
  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
    <span className="text-[10px] text-slate-400 block font-semibold">{label}</span>
    <strong className={`text-sm font-black ${toneClasses[tone || 'default']}`}>{value}</strong>
    {sub && <span className="text-[9px] text-slate-400 block font-bold mt-0.5">{sub}</span>}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</div>
    <div className="space-y-2">{children}</div>
  </div>
);

const EmptyState: React.FC<{ text: string; good?: boolean }> = ({ text, good }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
    {good ? '✓ ' : ''}{text}
  </div>
);
