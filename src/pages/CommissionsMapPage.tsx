import React, { useState } from 'react';
import { 
  Percent, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  UserCheck, 
  AlertCircle, 
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getCommissionStatusBadge } from '../utils/formatters';
import { CommissionStatus } from '../types';

export const CommissionsMapPage: React.FC = () => {
  const { commissions, payCommission, globalSearch } = useApp();

  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | CommissionStatus>('todos');

  const searchQuery = globalSearch || localSearch;

  const filteredCommissions = commissions.filter(comm => {
    const matchesSearch =
      comm.commissionerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.saleNumber.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter !== 'todos' && comm.status !== statusFilter) {
      return false;
    }

    return true;
  });

  // KPI Calculations
  const totalCommissionGenerated = commissions.reduce((acc, c) => acc + c.totalCommission, 0);
  const totalCommissionReleased = commissions.reduce((acc, c) => acc + c.releasedCommission, 0);
  const totalCommissionPaid = commissions.reduce((acc, c) => acc + c.paidCommission, 0);
  const totalPendingToPay = commissions
    .filter(c => c.status === 'liberada' || c.status === 'parcialmente_liberada')
    .reduce((acc, c) => acc + Math.max(0, c.releasedCommission - c.paidCommission), 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Mapa de Comissões por Indicação
            </h1>
            <span className="text-xs font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              Liberação Proporcional
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            As comissões são liberadas proporcionalmente conforme o cliente realiza os pagamentos.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Previsto Geral</span>
          <div className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(totalCommissionGenerated)}</div>
          <span className="text-[10px] text-slate-400">Total de comissão nas vendas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-blue-600">Total Liberado</span>
          <div className="text-xl font-black text-blue-700 mt-0.5">{formatCurrency(totalCommissionReleased)}</div>
          <span className="text-[10px] text-slate-500">Proporcional aos pagtos.</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-amber-500">Pronto p/ Pagar Agora</span>
          <div className="text-xl font-black text-amber-600 mt-0.5">{formatCurrency(totalPendingToPay)}</div>
          <span className="text-[10px] text-amber-600 font-medium">Liberado e aguardando repasse</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-emerald-600">Total Já Pago</span>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{formatCurrency(totalCommissionPaid)}</div>
          <span className="text-[10px] text-emerald-600">Lançado no financeiro</span>
        </div>
      </div>

      {/* Proportional Rule Explanatory Banner */}
      <div className="bg-gradient-to-r from-blue-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Percent className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <span className="font-bold text-sm text-blue-200 block">
              Regra de Liberação Proporcional de Comissões
            </span>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed max-w-2xl">
              Se o lojista pagar 50% do pedido, 50% da comissão do representante é liberada. Ao clicar em <strong>"Pagar Comissão"</strong>, o repasse entra automaticamente como saída no <strong>Financeiro</strong>.
            </p>
          </div>
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
            placeholder="Buscar por representante, cliente, venda..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'liberada', label: 'Liberadas p/ Pagar' },
            { id: 'parcialmente_liberada', label: 'Parciais' },
            { id: 'pendente', label: 'Pendentes' },
            { id: 'paga', label: 'Pagas' },
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

      {/* Commissions Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Comissionador</th>
                <th className="p-3.5">Cliente Indicado</th>
                <th className="p-3.5">Venda</th>
                <th className="p-3.5 text-center">Quantidade Vendida</th>
                <th className="p-3.5 text-right">Taxa / un</th>
                <th className="p-3.5 text-right">Total Previsto</th>
                <th className="p-3.5 text-right">Comissão Liberada</th>
                <th className="p-3.5 text-right">Já Pago</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                    Nenhuma comissão registrada.
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((comm) => {
                  const badge = getCommissionStatusBadge(comm.status);
                  const amountAvailableToPay = Math.max(0, comm.releasedCommission - comm.paidCommission);
                  const clientPaidPercent = comm.saleTotal > 0 ? Math.round((comm.salePaidAmount / comm.saleTotal) * 100) : 0;

                  return (
                    <tr key={comm.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Commissioner */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900">{comm.commissionerName}</div>
                      </td>

                      {/* Client */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{comm.clientName}</div>
                      </td>

                      {/* Sale Reference & Progress */}
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-blue-600 block">{comm.saleNumber}</span>
                        <span className="text-[10px] text-slate-500">
                          Cliente pagou {clientPaidPercent}% ({formatCurrency(comm.salePaidAmount)})
                        </span>
                      </td>

                      {/* Units */}
                      <td className="p-3.5 text-center font-bold text-slate-800">
                        {comm.totalUnits} un.
                      </td>

                      {/* Rate */}
                      <td className="p-3.5 text-right font-medium text-slate-600">
                        {formatCurrency(comm.ratePerUnit)}
                      </td>

                      {/* Total Predicted */}
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {formatCurrency(comm.totalCommission)}
                      </td>

                      {/* Released Commission */}
                      <td className="p-3.5 text-right font-black text-blue-700">
                        {formatCurrency(comm.releasedCommission)}
                      </td>

                      {/* Paid Commission */}
                      <td className="p-3.5 text-right font-bold text-emerald-600">
                        {formatCurrency(comm.paidCommission)}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Action Button: Pagar Comissão */}
                      <td className="p-3.5 text-center">
                        {comm.status === 'paga' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Paga
                          </span>
                        ) : amountAvailableToPay > 0 ? (
                          <button
                            onClick={() => {
                              if (confirm(`Confirmar o pagamento de ${formatCurrency(amountAvailableToPay)} de comissão para ${comm.commissionerName}? Esse valor sairá automaticamente no Financeiro.`)) {
                                payCommission(comm.id);
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all active:scale-95 whitespace-nowrap"
                          >
                            Pagar {formatCurrency(amountAvailableToPay)}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Aguardando cliente
                          </span>
                        )}
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
