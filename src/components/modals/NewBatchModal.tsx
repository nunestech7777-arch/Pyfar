import React, { useState } from 'react';
import { toLocalISODate } from '../../utils/financeRules';
import { X, PackagePlus, DollarSign, Calendar, Building2, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

export const NewBatchModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { addBatch, addToast } = useApp();

  const [vaccineName, setVaccineName] = useState('');
  const [manufacturer, setManufacturer] = useState('GSK');
  const [lotNumber, setLotNumber] = useState('');
  const [initialQuantity, setInitialQuantity] = useState<number>(100);
  const [unitCost, setUnitCost] = useState<number>(300);
  const [supplier, setSupplier] = useState('');
  const [entryDate, setEntryDate] = useState(() => toLocalISODate());
  const [expirationDate, setExpirationDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return toLocalISODate(d);
  });
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const totalCost = (Number(initialQuantity) || 0) * (Number(unitCost) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vaccineName.trim() || !lotNumber.trim()) {
      addToast('error', 'Campos Obrigatórios', 'Informe o nome do produto e o número do lote.');
      return;
    }

    if (initialQuantity <= 0 || unitCost <= 0) {
      addToast('error', 'Valores Inválidos', 'A quantidade e o custo unitário devem ser maiores que zero.');
      return;
    }

    addBatch({
      vaccineName: vaccineName.trim(),
      manufacturer: manufacturer.trim(),
      lotNumber: lotNumber.trim().toUpperCase(),
      initialQuantity: Number(initialQuantity),
      unitCost: Number(unitCost),
      supplier: supplier.trim() || undefined,
      entryDate,
      expirationDate,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const commonVaccines = [
    'Hexavalente Acelular',
    'Dengue Qdenga',
    'Pneumocócica 13',
    'Meningocócica ACWY',
    'HPV Nonavalente (Gardasil 9)',
    'Rotavírus Pentavalente',
    'Gripe Tetravalente',
    'Hepatite A Adulto',
    'Febre Amarela',
    'Varicela (Catapora)',
    'Herpes Zóster (Shingrix)',
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Entrada de Estoque
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Cadastrar Novo Lote / Compra
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Quick Product suggestions */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Nome do Produto <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              placeholder="Ex: Nome do produto, medicamento, injetável..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase py-0.5">Sugestões:</span>
              {commonVaccines.slice(0, 5).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVaccineName(v)}
                  className="text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 px-2 py-0.5 rounded-lg transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Manufacturer & Lot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Fabricante / Laboratório <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="Ex: GSK, Sanofi Pasteur, Pfizer, MSD, Takeda"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Número do Lote <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="Ex: HEX-8801, QDG-9012"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Quantidade (un) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                placeholder="Ex: 100"
                value={initialQuantity || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setInitialQuantity(e.target.value === '' ? 0 : Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Preço de Custo Unitário (R$) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={unitCost || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setUnitCost(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Automatic Financial Outflow Callout Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-[11px] font-semibold text-blue-300 uppercase">
                Total da Compra de Estoque
              </span>
              <div className="text-2xl font-black text-white mt-0.5">
                {formatCurrency(totalCost)}
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                ✓ Será registrado automaticamente como despesa de compra no Financeiro.
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-600/40 flex items-center justify-center">
              <PackagePlus className="w-5 h-5 text-blue-200" />
            </div>
          </div>

          {/* Supplier & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Fornecedor (Opcional)
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Ex: Distribuidora FarmaBrasil"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Data de Entrada <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Data de Validade <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Observações do Lote (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: 'Armazenar em temperatura de 2°C a 8°C. Caixa lacrada.'"
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
            <span>Salvar Entrada & Atualizar Estoque</span>
          </button>
        </div>
      </div>
    </div>
  );
};
