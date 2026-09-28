import React, { useState } from 'react';
import { 
  UserCheck, 
  Search, 
  PlusCircle, 
  Phone, 
  Percent, 
  Users, 
  DollarSign, 
  Edit3, 
  Trash2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { Commissioner } from '../types';

export const CommissionersPage: React.FC<{
  onOpenNewCommissioner: () => void;
  onEditCommissioner: (comm: Commissioner) => void;
}> = ({ onOpenNewCommissioner, onEditCommissioner }) => {
  const { commissioners, deleteCommissioner, clients, commissions, setCurrentModule, globalSearch } = useApp();

  const [localSearch, setLocalSearch] = useState('');
  const searchQuery = globalSearch || localSearch;

  // Calculate statistics for each commissioner
  const commissionerStats = commissioners.map(comm => {
    const linkedClients = clients.filter(c => c.commissionerId === comm.id);
    const commEntries = commissions.filter(c => c.commissionerId === comm.id);
    
    const totalGenerated = commEntries.reduce((acc, c) => acc + c.totalCommission, 0);
    const totalReleased = commEntries.reduce((acc, c) => acc + c.releasedCommission, 0);
    const totalPaid = commEntries.reduce((acc, c) => acc + c.paidCommission, 0);
    const pendingToPay = Math.max(0, totalReleased - totalPaid);

    return {
      ...comm,
      linkedClients,
      totalGenerated,
      totalReleased,
      totalPaid,
      pendingToPay,
    };
  });

  const filteredCommissioners = commissionerStats.filter(comm =>
    comm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (comm.phone && comm.phone.includes(searchQuery)) ||
    (comm.notes && comm.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Comissionadores & Representantes
            </h1>
            <span className="text-xs font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              {commissioners.length} cadastrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cadastro de representantes e consultores que ganham comissão fixa por unidade vendida aos clientes indicados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentModule('mapa_comissoes')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
          >
            <Percent className="w-4 h-4 text-blue-600" />
            <span>Ver Mapa de Comissões</span>
          </button>

          <button
            onClick={onOpenNewCommissioner}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-blue-glow transition-all flex items-center gap-2 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Novo Comissionador</span>
          </button>
        </div>
      </div>

      {/* Commissioners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCommissioners.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400 font-medium">
            Nenhum comissionador cadastrado ou encontrado na busca.
          </div>
        ) : (
          filteredCommissioners.map((comm) => (
            <div
              key={comm.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-card hover:shadow-card-hover p-5 flex flex-col justify-between transition-all duration-200"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {comm.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold mt-0.5">
                      <Percent className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{formatCurrency(comm.defaultRatePerUnit)} por unidade vendida</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditCommissioner(comm)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja remover o comissionador ${comm.name}?`)) {
                          deleteCommissioner(comm.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info Pills */}
                <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                  {comm.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{comm.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span>
                      <strong>{comm.linkedClients.length}</strong> clientes vinculados
                    </span>
                  </div>

                  {comm.linkedClients.length > 0 && (
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 truncate">
                      Lojistas: {comm.linkedClients.map(c => c.name).join(', ')}
                    </div>
                  )}

                  {comm.notes && (
                    <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/60">
                      "{comm.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Commission Stats */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Gerado Previsto:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(comm.totalGenerated)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Já Pago:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(comm.totalPaid)}</span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="font-bold text-slate-700">Saldo Liberado p/ Pagamento:</span>
                  <span className="font-black text-amber-600 text-sm">
                    {formatCurrency(comm.pendingToPay)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
