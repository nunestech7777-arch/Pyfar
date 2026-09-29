import React, { useState } from 'react';
import { 
  CircleDollarSign, 
  Search, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  DollarSign, 
  User, 
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getDaysOverdue, getSaleStatusBadge } from '../utils/formatters';
import { Sale } from '../types';
import { isSaleOverdue } from '../utils/financeRules';

export const ReceivablesPage: React.FC<{
  onOpenRecordPayment: (sale: Sale) => void;
}> = ({ onOpenRecordPayment }) => {
  const { sales, setViewingReceiptSale, globalSearch } = useApp();

  const [localSearch, setLocalSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'atrasados' | 'a_vencer' | 'quitados'>('todos');

  const searchQuery = globalSearch || localSearch;

  // Get active sales
  const eligibleSales = sales.filter(s => s.status !== 'cancelado');

  const processedSales = eligibleSales.map(sale => {
    const isPaid = sale.remainingBalance <= 0;
    const daysOverdue = getDaysOverdue(sale.dueDate);
    const isOverdue = isSaleOverdue(sale);

    return {
      ...sale,
      isPaid,
      daysOverdue,
      isOverdue,
    };
  });

  const filteredSales = processedSales.filter(sale => {
    const matchesSearch =
      sale.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.saleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.storeName && sale.storeName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === 'atrasados') return sale.isOverdue;
    if (filter === 'a_vencer') return !sale.isPaid && !sale.isOverdue;
    if (filter === 'quitados') return sale.isPaid;

    return true;
  });

  // KPIs
  const totalReceivable = processedSales
    .filter(s => !s.isPaid)
    .reduce((acc, s) => acc + s.remainingBalance, 0);

  const totalOverdue = processedSales
    .filter(s => s.isOverdue)
    .reduce((acc, s) => acc + s.remainingBalance, 0);

  const totalCollected = processedSales
    .reduce((acc, s) => acc + s.paidAmount, 0);

  const overdueClientsCount = processedSales.filter(s => s.isOverdue).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Contas a Receber & Cobranças
            </h1>
            <span className="text-xs font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              Gestão de Fiado e Prazo
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Saiba exatamente quem está devendo, quanto deve, quando vence e dê baixa em pagamentos parciais ou totais.
          </p>
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total a Receber</span>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{formatCurrency(totalReceivable)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Saldo pendente de todos os clientes</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-100 shadow-card bg-gradient-to-br from-rose-50/40 to-white">
          <span className="text-[11px] font-bold uppercase text-rose-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Total em Atraso (Vencido)
          </span>
          <div className="text-2xl font-black text-rose-600 mt-0.5">{formatCurrency(totalOverdue)}</div>
          <p className="text-[11px] text-rose-500 font-bold mt-1">{overdueClientsCount} pedido(s) ultrapassaram o vencimento</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-emerald-600">Total Já Quitado</span>
          <div className="text-2xl font-black text-emerald-600 mt-0.5">{formatCurrency(totalCollected)}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Entradas e parcelas recebidas</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar por cliente, loja, venda..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'todos', label: 'Todos os Recebíveis' },
            { id: 'atrasados', label: 'Em Atraso ⚠️' },
            { id: 'a_vencer', label: 'A Vencer no Prazo' },
            { id: 'quitados', label: 'Já Quitados' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === f.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Cliente / Lojista</th>
                <th className="p-3.5">Venda Relacionada</th>
                <th className="p-3.5 text-right">Valor Total</th>
                <th className="p-3.5 text-right">Valor Já Pago</th>
                <th className="p-3.5 text-right">Saldo Restante</th>
                <th className="p-3.5">Data Vencimento</th>
                <th className="p-3.5 text-center">Dias Atraso</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                    Nenhum título a receber encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const badge = getSaleStatusBadge(sale);

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Client Name */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 text-sm">{sale.clientName}</div>
                        {sale.storeName && (
                          <div className="text-[11px] text-slate-500 font-medium">{sale.storeName}</div>
                        )}
                      </td>

                      {/* Sale Reference */}
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-blue-600 block">{sale.saleNumber}</span>
                        <span className="text-[10px] text-slate-400">({sale.totalQuantity} un)</span>
                      </td>

                      {/* Total Amount */}
                      <td className="p-3.5 text-right font-bold text-slate-800">
                        {formatCurrency(sale.totalAmount)}
                      </td>

                      {/* Paid Amount */}
                      <td className="p-3.5 text-right font-bold text-emerald-600">
                        {formatCurrency(sale.paidAmount)}
                      </td>

                      {/* Remaining Debt */}
                      <td className="p-3.5 text-right">
                        {sale.remainingBalance > 0 ? (
                          <span className="font-black text-rose-600 text-sm">
                            {formatCurrency(sale.remainingBalance)}
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-600 text-xs">
                            R$ 0,00 (Pago)
                          </span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">
                          {formatDate(sale.dueDate)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {sale.installmentsCount} parcela(s)
                        </span>
                      </td>

                      {/* Days Overdue */}
                      <td className="p-3.5 text-center">
                        {sale.isOverdue ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <Clock className="w-3 h-3" />
                            {sale.daysOverdue} dias atras.
                          </span>
                        ) : sale.remainingBalance > 0 ? (
                          <span className="text-slate-500 text-[11px]">No prazo</span>
                        ) : (
                          <span className="text-emerald-600 font-bold text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {sale.remainingBalance > 0 ? (
                            <button
                              onClick={() => onOpenRecordPayment(sale)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Registrar Pagt.</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Quitado
                            </span>
                          )}

                          <button
                            onClick={() => setViewingReceiptSale(sale)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver Comprovante"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
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
