import React, { useState } from 'react';
import { Search, UserPlus, Pencil, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { useSeller } from '../../context/SellerContext';
import { SellerClient } from '../../types';
import { SellerClientModal } from '../../components/seller/SellerClientModal';
import { formatCurrency, formatDate, getSaleStatusBadge } from '../../utils/formatters';

// Clientes da empresa (cadastrados pelo admin) + os do próprio vendedor, com o histórico das vendas
// dele para cada um. Só edita os que ele cadastrou; sem exclusão (apenas o admin remove clientes).
export const SellerClientsPage: React.FC = () => {
  const { data } = useSeller();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<SellerClient | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (!data) return null;

  const q = search.trim().toLowerCase();
  const clients = data.clients.filter(c => !q
    || c.name.toLowerCase().includes(q)
    || (c.storeName ?? '').toLowerCase().includes(q)
    || (c.phone ?? '').includes(q));

  const openModal = (client: SellerClient | null) => {
    setClientToEdit(client);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => openModal(null)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl"
        >
          <UserPlus className="w-4 h-4" /> Novo cliente
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center text-sm text-slate-500">
          Nenhum cliente encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {clients.map(client => {
            const clientSales = data.sales
              .filter(s => s.clientId === client.id)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            const isExpanded = expandedId === client.id;
            return (
              <div key={client.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{client.name}</div>
                    {client.storeName && <div className="text-xs text-slate-500">{client.storeName}</div>}
                    {client.phone && (
                      <div className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {client.phone}
                      </div>
                    )}
                    {client.notes && <p className="text-xs text-slate-500 mt-1.5 italic">{client.notes}</p>}
                    {client.sellerName && (
                      <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Cadastrado pelo vendedor {client.sellerName}
                      </span>
                    )}
                  </div>
                  {client.isOwn && (
                    <button
                      onClick={() => openModal(client)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl flex-shrink-0"
                      title="Editar cliente"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setExpandedId(isExpanded ? null : client.id)}
                  className="mt-3 w-full flex items-center justify-between text-xs font-semibold text-blue-700 bg-blue-50/60 hover:bg-blue-50 rounded-xl px-3 py-2"
                >
                  <span>{clientSales.length} venda(s) • {formatCurrency(clientSales.filter(s => s.status !== 'cancelado').reduce((a, s) => a + s.totalAmount, 0))}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isExpanded && (
                  <div className="mt-2 divide-y divide-slate-100">
                    {clientSales.length === 0 ? (
                      <p className="text-xs text-slate-500 py-2">Nenhuma venda para este cliente.</p>
                    ) : clientSales.map(sale => {
                      const badge = getSaleStatusBadge(sale);
                      return (
                        <div key={sale.id} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-slate-800">{sale.saleNumber}</div>
                            <div className="text-slate-400">{formatDate(sale.createdAt)} • vence {formatDate(sale.dueDate)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">{formatCurrency(sale.totalAmount)}</div>
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>{badge.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SellerClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} clientToEdit={clientToEdit} />
    </div>
  );
};
