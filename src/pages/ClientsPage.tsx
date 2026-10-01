import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  PlusCircle, 
  Phone, 
  Building2, 
  MapPin, 
  DollarSign, 
  ShoppingBag, 
  Edit3, 
  Trash2, 
  UserCheck,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Client } from '../types';

export const ClientsPage: React.FC<{
  onOpenNewClient: () => void;
  onEditClient: (client: Client) => void;
}> = ({ onOpenNewClient, onEditClient }) => {
  const { clients, deleteClient, sales, commissioners, globalSearch } = useApp();

  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'com_divida' | 'ativos' | 'inativos'>('todos');

  const searchQuery = globalSearch || localSearch;

  // Calculate client stats
  const clientStats = clients.map(client => {
    const clientSales = sales.filter(s => s.clientId === client.id && s.status !== 'cancelado');
    const totalBought = clientSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalOwed = clientSales.reduce((acc, s) => acc + s.remainingBalance, 0);
    const totalDoses = clientSales.reduce((acc, s) => acc + s.totalQuantity, 0);
    const commissioner = client.commissionerId
      ? commissioners.find(c => c.id === client.commissionerId)
      : undefined;

    return {
      ...client,
      totalSalesCount: clientSales.length,
      totalBought,
      totalOwed,
      totalDoses,
      commissioner,
    };
  });

  const filteredClients = clientStats.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.storeName && c.storeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'com_divida') return c.totalOwed > 0;
    if (statusFilter === 'ativos') return c.status === 'ativo';
    if (statusFilter === 'inativos') return c.status === 'inativo';

    return true;
  });

  const totalClientsCount = clients.length;
  const clientsWithDebt = clientStats.filter(c => c.totalOwed > 0).length;
  const totalDebtOverall = clientStats.reduce((acc, c) => acc + c.totalOwed, 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Clientes
            </h1>
            <span className="text-xs font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              {totalClientsCount} clientes cadastrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cadastro ágil e simplificado (apenas o nome é obrigatório).
          </p>
        </div>

        <button
          onClick={onOpenNewClient}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-blue-glow transition-all flex items-center gap-2 active:scale-95 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Cadastrar Cliente</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total de Clientes</span>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{totalClientsCount} lojistas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-amber-500">Clientes com Saldo a Pagar</span>
          <div className="text-2xl font-black text-amber-600 mt-0.5">{clientsWithDebt} clientes</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-rose-500">Total a Receber da Carteira</span>
          <div className="text-2xl font-black text-rose-600 mt-0.5">{formatCurrency(totalDebtOverall)}</div>
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
            placeholder="Buscar por nome, loja, cidade, fone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'com_divida', label: 'Com Saldo Devedor' },
            { id: 'ativos', label: 'Ativos' },
            { id: 'inativos', label: 'Inativos' },
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

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400 font-medium">
            Nenhum cliente encontrado.
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-card hover:shadow-card-hover p-5 flex flex-col justify-between transition-all duration-200"
            >
              <div>
                {/* Header with Name & Actions */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {client.name}
                    </h3>
                    {client.storeName ? (
                      <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold mt-0.5">
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{client.storeName}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Sem loja cadastrada</span>
                    )}
                    {client.sellerName && (
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Cadastrado pelo vendedor {client.sellerName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditClient(client)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar cliente"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja remover o cliente ${client.name}?`)) {
                          deleteClient(client.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details List */}
                <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{client.phone}</span>
                    </div>
                  )}

                  {client.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{client.city}</span>
                    </div>
                  )}

                  {client.commissioner && (
                    <div className="flex items-center gap-2 text-indigo-700 font-semibold pt-1 border-t border-slate-200/60">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Indicação: {client.commissioner.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Purchase & Debt Stats */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Comprado</span>
                  <span className="font-extrabold text-slate-900">{formatCurrency(client.totalBought)}</span>
                  <span className="text-[10px] text-slate-500 block">({client.totalSalesCount} pedidos)</span>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Saldo a Pagar</span>
                  {client.totalOwed > 0 ? (
                    <span className="font-black text-rose-600 text-sm">
                      {formatCurrency(client.totalOwed)}
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-600 flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Em dia
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
