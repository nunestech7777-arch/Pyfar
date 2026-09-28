import React, { useState } from 'react';
import { X, UserCheck, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Commissioner } from '../../types';

interface NewCommissionerModalProps {
  isOpen: boolean;
  onClose: () => void;
  commissionerToEdit?: Commissioner | null;
}

export const NewCommissionerModal: React.FC<NewCommissionerModalProps> = ({
  isOpen,
  onClose,
  commissionerToEdit,
}) => {
  const { addCommissioner, updateCommissioner, addToast } = useApp();

  const [name, setName] = useState(commissionerToEdit?.name || '');
  const [phone, setPhone] = useState(commissionerToEdit?.phone || '');
  const [defaultRatePerUnit, setDefaultRatePerUnit] = useState<number>(
    commissionerToEdit?.defaultRatePerUnit || 1.00
  );
  const [notes, setNotes] = useState(commissionerToEdit?.notes || '');
  const [status, setStatus] = useState<'ativo' | 'inativo'>(commissionerToEdit?.status || 'ativo');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      addToast('error', 'Nome Obrigatório', 'Informe o nome do comissionador.');
      return;
    }

    if (commissionerToEdit) {
      updateCommissioner(commissionerToEdit.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        defaultRatePerUnit: Number(defaultRatePerUnit) || 1.0,
        notes: notes.trim() || undefined,
        status,
      });
    } else {
      addCommissioner({
        name: name.trim(),
        phone: phone.trim() || undefined,
        defaultRatePerUnit: Number(defaultRatePerUnit) || 1.0,
        notes: notes.trim() || undefined,
        status,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Comissionador
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              {commissionerToEdit ? 'Editar Comissionador' : 'Novo Comissionador'}
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
          
          {/* Nome (Obrigatório) */}
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <label className="block text-xs font-bold uppercase text-slate-800 mb-1">
              Nome do Comissionador <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Gabriel Representante, Marcos Consultoria..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
          </div>

          {/* Telefone & Taxa Padrão por Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Telefone / WhatsApp (Opcional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Comissão Padrão por Unidade (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-xs">R$</span>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  placeholder="0,00"
                  value={defaultRatePerUnit || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDefaultRatePerUnit(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Ex: R$ 1,00 por unidade vendida</span>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Status do Comissionador
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

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Observações (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Representante responsável pelas clínicas da região litorânea..."
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
            <span>Salvar Comissionador</span>
          </button>
        </div>
      </div>
    </div>
  );
};
