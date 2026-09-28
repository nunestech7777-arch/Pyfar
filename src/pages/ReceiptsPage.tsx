import React, { useState } from 'react';
import { 
  ReceiptText, 
  Search, 
  Eye, 
  Share2, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Building2 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getPaymentMethodLabel, getPaymentStatusBadge } from '../utils/formatters';

export const ReceiptsPage: React.FC = () => {
  const { sales, setViewingReceiptSale, globalSearch } = useApp();

  const [localSearch, setLocalSearch] = useState('');
  const searchQuery = globalSearch || localSearch;

  const filteredSales = sales.filter(s =>
    s.saleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.storeName && s.storeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    s.items.some(it => it.vaccineName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Comprovantes de Venda
            </h1>
            <span className="text-xs font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              {sales.length} comprovantes
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gere comprovantes profissionais para envio via WhatsApp ou impressão (dados internos de custo e lucro permanecem ocultos).
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar por cliente, número do pedido ou vacina..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Receipts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSales.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400 font-medium">
            Nenhum comprovante encontrado.
          </div>
        ) : (
          filteredSales.map((sale) => {
            const statusBadge = getPaymentStatusBadge(sale.status);

            return (
              <div
                key={sale.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-card hover:shadow-card-hover p-5 flex flex-col justify-between transition-all duration-200"
              >
                <div>
                  {/* Top line with Order Number & Status */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
                    <div>
                      <span className="font-mono font-black text-sm text-blue-600 block">
                        {sale.saleNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(sale.createdAt)}
                      </span>
                    </div>

                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Client */}
                  <div className="mb-3">
                    <h3 className="text-base font-extrabold text-slate-900">{sale.clientName}</h3>
                    {sale.storeName && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{sale.storeName}</span>
                      </div>
                    )}
                  </div>

                  {/* Items summary */}
                  <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100 space-y-1 mb-4 text-xs">
                    <div className="font-bold text-slate-600 uppercase text-[10px]">
                      Produtos ({sale.totalQuantity} un no total):
                    </div>
                    {sale.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-slate-700">
                        <span className="truncate max-w-[180px]">• {it.quantity}x {it.vaccineName} ({it.lotNumber})</span>
                        <span className="font-bold">{formatCurrency(it.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer with Amount & Actions */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Valor Total</span>
                      <span className="text-base font-black text-slate-900">{formatCurrency(sale.totalAmount)}</span>
                    </div>

                    {sale.remainingBalance > 0 ? (
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Saldo a Pagar</span>
                        <span className="font-bold text-rose-600">{formatCurrency(sale.remainingBalance)}</span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-emerald-600">100% Pago</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <button
                    onClick={() => setViewingReceiptSale(sale)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Visualizar / Copiar WhatsApp / Imprimir</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
