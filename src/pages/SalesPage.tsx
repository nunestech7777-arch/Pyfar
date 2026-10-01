import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  PlusCircle, 
  Receipt, 
  Trash2, 
  Eye, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ChevronRight,
  Share2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getEffectiveSaleStatus } from '../utils/financeRules';
import { formatCurrency, formatDate, getPaymentMethodLabel, getSaleStatusBadge } from '../utils/formatters';
import { PaymentStatus } from '../types';

export const SalesPage: React.FC<{ onOpenNewSale: () => void }> = ({ onOpenNewSale }) => {
  const { sales, cancelSale, setViewingReceiptSale, globalSearch } = useApp();

  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | PaymentStatus>('todos');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<string | null>(null);

  const searchQuery = globalSearch || localSearch;

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.saleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.storeName && sale.storeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      sale.items.some(it => it.vaccineName.toLowerCase().includes(searchQuery.toLowerCase()) || it.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter !== 'todos' && getEffectiveSaleStatus(sale) !== statusFilter) {
      return false;
    }

    return true;
  });

  // Summary Metrics
  const activeSales = sales.filter(s => s.status !== 'cancelado');
  const totalSold = activeSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalGrossProfit = activeSales.reduce((acc, s) => acc + s.grossProfit, 0);
  const totalReceived = activeSales.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalReceivable = activeSales.reduce((acc, s) => acc + s.remainingBalance, 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Vendas
            </h1>
            <span className="text-xs font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              {sales.length} vendas registradas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle de pedidos, lucro por lote, baixa de estoque e geração de comprovantes.
          </p>
        </div>

        <button
          onClick={onOpenNewSale}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-blue-glow transition-all flex items-center gap-2 active:scale-95 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Nova Venda</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Faturado</span>
          <div className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(totalSold)}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-emerald-600">Lucro Bruto Total</span>
          <div className="text-xl font-black text-emerald-600 mt-0.5 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {formatCurrency(totalGrossProfit)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-blue-600">Valor Já Recebido</span>
          <div className="text-xl font-black text-blue-700 mt-0.5">{formatCurrency(totalReceived)}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-amber-500">Saldo a Receber</span>
          <div className="text-xl font-black text-amber-600 mt-0.5">{formatCurrency(totalReceivable)}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar por cliente, pedido, lote..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'pago', label: 'Pagas' },
            { id: 'parcialmente_pago', label: 'Parcial' },
            { id: 'pendente', label: 'Pendentes' },
            { id: 'atrasado', label: 'Atrasadas' },
            { id: 'cancelado', label: 'Canceladas' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === f.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Nº Venda & Data</th>
                <th className="p-3.5">Cliente / Lojista</th>
                <th className="p-3.5">Produtos / Lotes</th>
                <th className="p-3.5 text-center">Quantidade</th>
                <th className="p-3.5 text-right">Valor Venda</th>
                <th className="p-3.5 text-right">Lucro Bruto</th>
                <th className="p-3.5 text-right">Saldo Restante</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                    Nenhuma venda encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const statusBadge = getSaleStatusBadge(sale);
                  const isExpanded = selectedSaleDetail === sale.id;

                  return (
                    <React.Fragment key={sale.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        
                        {/* Sale Number & Date */}
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-blue-600 block">{sale.saleNumber}</span>
                          <span className="text-[11px] text-slate-400">{formatDate(sale.createdAt)}</span>
                        </td>

                        {/* Client */}
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900">{sale.clientName}</div>
                          {sale.storeName && (
                            <div className="text-[11px] text-slate-500">{sale.storeName}</div>
                          )}
                          {sale.sellerName && (
                            <div className="text-[10px] font-semibold text-indigo-600">Vendedor: {sale.sellerName}</div>
                          )}
                        </td>

                        {/* Items preview */}
                        <td className="p-3.5">
                          <div className="text-slate-800 font-medium max-w-[240px] truncate">
                            {sale.items.map(it => `${it.quantity}x ${it.vaccineName} (${it.lotNumber})`).join(', ')}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedSaleDetail(isExpanded ? null : sale.id)}
                            className="text-[10px] font-bold text-blue-600 hover:underline mt-0.5 block"
                          >
                            {isExpanded ? 'Ocultar detalhes ▲' : `Ver ${sale.items.length} item(ns) detalhados ▼`}
                          </button>
                        </td>

                        {/* Doses */}
                        <td className="p-3.5 text-center font-bold text-slate-900">
                          {sale.totalQuantity}
                        </td>

                        {/* Total Amount */}
                        <td className="p-3.5 text-right font-black text-slate-900 text-sm">
                          {formatCurrency(sale.totalAmount)}
                        </td>

                        {/* Gross Profit */}
                        <td className="p-3.5 text-right font-black text-emerald-600">
                          +{formatCurrency(sale.grossProfit)}
                        </td>

                        {/* Remaining Debt */}
                        <td className="p-3.5 text-right">
                          {sale.remainingBalance > 0 ? (
                            <span className="font-bold text-rose-600">
                              {formatCurrency(sale.remainingBalance)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold text-[11px]">
                              Quitado
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bg}`}>
                            {statusBadge.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewingReceiptSale(sale)}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-colors"
                              title="Visualizar Comprovante / Recibo"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>

                            {sale.status !== 'cancelado' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Deseja cancelar a venda ${sale.saleNumber}? O estoque será devolvido automaticamente.`)) {
                                    cancelSale(sale.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Cancelar venda"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Item Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200/80">
                          <td colSpan={9} className="p-4 pl-8">
                            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <span className="font-bold text-xs text-slate-800">
                                  Detalhamento de Itens, Custos e Lucro Unitário da Venda {sale.saleNumber}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Pagamento: <strong>{getPaymentMethodLabel(sale.paymentMethod)}</strong> • Entrada: {formatCurrency(sale.downPayment)} • Vencimento: {formatDate(sale.dueDate)}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {sale.items.map((it, i) => (
                                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                                    <div className="font-extrabold text-slate-900">{it.vaccineName}</div>
                                    <div className="text-slate-500 font-mono text-[11px]">Lote: {it.lotNumber}</div>
                                    <div className="flex justify-between pt-1 border-t border-slate-200 text-[11px]">
                                      <span>Qtd: <strong>{it.quantity} un</strong></span>
                                      <span>Venda: <strong>{formatCurrency(it.unitPrice)}</strong></span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-slate-500">Custo: {formatCurrency(it.unitCost)}</span>
                                      <span className="text-emerald-600 font-bold">Lucro un: +{formatCurrency(it.unitPrice - it.unitCost)}</span>
                                    </div>
                                    <div className="pt-1 text-right font-black text-slate-900 text-xs">
                                      Total Item: {formatCurrency(it.totalPrice)}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {sale.commissionerName && (
                                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 flex justify-between items-center">
                                  <span>
                                    <strong>Comissão:</strong> {sale.commissionerName} ({formatCurrency(sale.commissionRatePerUnit || 1)}/un)
                                  </span>
                                  <span className="font-bold">Total Previsto: {formatCurrency(sale.commissionTotal || 0)}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
