import React, { useEffect, useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { SellerClient } from '../../types';
import { SellerClientInput } from '../../services/sellerApi';
import { useSeller } from '../../context/SellerContext';

const EMPTY: SellerClientInput = { name: '', storeName: '', phone: '', cnpj: '', city: '', address: '', notes: '' };

const FIELDS: Array<{ key: keyof SellerClientInput; label: string; placeholder?: string }> = [
  { key: 'storeName', label: 'Estabelecimento', placeholder: 'Ex: Farmácia Central' },
  { key: 'phone', label: 'Telefone', placeholder: '(00) 00000-0000' },
  { key: 'cnpj', label: 'CNPJ / CPF' },
  { key: 'city', label: 'Cidade' },
  { key: 'address', label: 'Endereço' },
];

// Cadastro/edição de cliente do vendedor. Só dados básicos: vínculo com vendedor e comissionador
// são definidos pelo servidor/admin e não aparecem aqui.
export const SellerClientModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: SellerClient | null;
  onSaved?: (client: SellerClient) => void;
}> = ({ isOpen, onClose, clientToEdit, onSaved }) => {
  const { createClient, updateClient } = useSeller();
  const [form, setForm] = useState<SellerClientInput>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(clientToEdit
      ? {
          name: clientToEdit.name,
          storeName: clientToEdit.storeName ?? '',
          phone: clientToEdit.phone ?? '',
          cnpj: clientToEdit.cnpj ?? '',
          city: clientToEdit.city ?? '',
          address: clientToEdit.address ?? '',
          notes: clientToEdit.notes ?? '',
        }
      : EMPTY);
  }, [isOpen, clientToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const saved = clientToEdit ? await updateClient(clientToEdit.id, form) : await createClient(form);
      if (saved) {
        onSaved?.(saved);
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = 'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            {clientToEdit ? 'Editar cliente' : 'Novo cliente'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nome <span className="text-rose-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              maxLength={120}
              required
              autoFocus
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map(field => (
              <div key={field.key} className={field.key === 'address' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">{field.label}</label>
                <input
                  value={form[field.key] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  maxLength={field.key === 'address' ? 300 : 120}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Observações</label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              maxLength={1000}
              className={inputClass}
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || !form.name.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl"
          >
            {isSaving ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </div>
      </form>
    </div>
  );
};
