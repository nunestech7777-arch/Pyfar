import React, { useState } from 'react';
import { X, UserPlus, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Client } from '../../types';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  onClose,
  clientToEdit,
}) => {
  const { addClient, updateClient, commissioners, addToast } = useApp();

  const [name, setName] = useState(clientToEdit?.name || '');
  const [storeName, setStoreName] = useState(clientToEdit?.storeName || '');
  const [phone, setPhone] = useState(clientToEdit?.phone || '');
  const [cnpj, setCnpj] = useState(clientToEdit?.cnpj || '');
  const [city, setCity] = useState(clientToEdit?.city || '');
  const [address, setAddress] = useState(clientToEdit?.address || '');
  const [commissionerId, setCommissionerId] = useState(clientToEdit?.commissionerId || '');
  const [notes, setNotes] = useState(clientToEdit?.notes || '');
  const [status, setStatus] = useState<'ativo' | 'inativo'>(clientToEdit?.status || 'ativo');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // REGRA DE NEGÓCIO MANDATÓRIA:
    // O único campo obrigatório deve ser: Nome do lojista
    if (!name.trim()) {
      addToast('error', 'Nome Obrigatório', 'Por favor, informe ao menos o nome do lojista.');
      return;
    }

    if (clientToEdit) {
      updateClient(clientToEdit.id, {
        name: name.trim(),
        storeName: storeName.trim() || undefined,
        phone: phone.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        commissionerId: commissionerId || undefined,
        notes: notes.trim() || undefined,
        status,
      });
    } else {
      addClient({
        name: name.trim(),
        storeName: storeName.trim() || undefined,
        phone: phone.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        commissionerId: commissionerId || undefined,
        notes: notes.trim() || undefined,
        status,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {clientToEdit ? 'Editar Cadastro' : 'Cadastro Rápido'}
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          
          {/* Nome (Único obrigatório) */}
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <label className="block text-xs font-bold uppercase text-slate-800 mb-1">
              Nome do Lojista / Responsável <span className="text-rose-500 font-black">* (Obrigatório)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Paulo Henrique, Fernanda Martins, Luiz..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
            <p className="text-[11px] text-blue-700 mt-1.5">
              💡 Você pode salvar o cliente informando apenas o nome se estiver com pressa.
            </p>
          </div>

          {/* Opcionais: Nome da Loja & Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nome da Loja / Clínica (Opcional)
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ex: Clínica Vacinar & Vida"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Telefone / WhatsApp (Opcional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: (11) 99123-4567"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* CNPJ & Cidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                CNPJ (Opcional)
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cidade / UF (Opcional)
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo - SP"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Endereço Completo (Opcional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Av. Paulista, 1500 - Sala 42"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Comissionador Vinculado & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Comissionador / Indicação
              </label>
              <select
                value={commissionerId}
                onChange={(e) => setCommissionerId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Nenhum (Cliente Direto)</option>
                {commissioners.map(comm => (
                  <option key={comm.id} value={comm.id}>
                    {comm.name} (R$ {comm.defaultRatePerUnit.toFixed(2)}/un.)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Status do Cliente
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ativo' | 'inativo')}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Observações (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: 'Prefere receber lotes com validade superior a 6 meses...'"
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-blue-glow transition-all flex items-center gap-2 active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{clientToEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
