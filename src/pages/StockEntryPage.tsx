import React, { useState } from 'react';
import { 
  PackagePlus, 
  Search, 
  Calendar, 
  Building2, 
  DollarSign, 
  CheckCircle2, 
  ArrowDownRight, 
  History, 
  AlertCircle 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';

export const StockEntryPage: React.FC<{ onOpenNewBatchModal: () => void }> = ({ onOpenNewBatchModal }) => {
  const { batches, addBatch, financialTransactions } = useApp();

  // Quick form state
  const [vaccineName, setVaccineName] = useState('');
  const [manufacturer, setManufacturer] = useState('GSK');
  const [lotNumber, setLotNumber] = useState('');
  const [initialQuantity, setInitialQuantity] = useState<number>(200);
  const [unitCost, setUnitCost] = useState<number>(350);
  const [supplier, setSupplier] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expirationDate, setExpirationDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  const totalPurchaseValue = (Number(initialQuantity) || 0) * (Number(unitCost) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaccineName.trim() || !lotNumber.trim()) return;

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

    // Reset form
    setVaccineName('');
    setLotNumber('');
    setSupplier('');
    setNotes('');
  };

  // Recent Stock Purchases
  const recentPurchases = batches.slice(0, 10);

  const commonVaccines = [
    'Hexavalente Acelular',
    'Dengue Qdenga',
    'Pneumocócica 13',
    'Meningocócica ACWY',
    'HPV Nonavalente (Gardasil 9)',
    'Rotavírus Pentavalente',
    'Gripe Tetravalente',
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Page Title */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Entrada de Estoque & Compras
            </h1>
            <span className="text-xs font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              Lançamento Direto
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cada entrada aumenta a quantidade disponível do lote e registra o custo total como saída no Financeiro.
          </p>
        </div>

        <button
          onClick={onOpenNewBatchModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-blue-glow transition-all flex items-center gap-2 active:scale-95 self-start sm:self-auto"
        >
          <PackagePlus className="w-4 h-4" />
          <span>+ Abrir Modal de Cadastro</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Direct Fast Entry Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Formulário de Entrada Rápida</h3>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                Entrada à Vista
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Nome do Produto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={vaccineName}
                  onChange={(e) => setVaccineName(e.target.value)}
                  placeholder="Ex: Nome do produto, medicamento, injetável..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                
                {/* Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase py-0.5">Sugestões:</span>
                  {commonVaccines.slice(0, 4).map(v => (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Fabricante <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="GSK, Sanofi, Pfizer, MSD, Takeda..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Número do Lote <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Ex: HEX-9090"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Quantity & Unit Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-800 mb-1">
                    Quantidade (un) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 100"
                    value={initialQuantity || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setInitialQuantity(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-800 mb-1">
                    Preço de Custo Unitário (R$) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={unitCost || ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setUnitCost(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Purchase Total Banner */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Custo Total da Compra
                  </span>
                  <div className="text-xl font-black text-blue-400 mt-0.5">
                    {formatCurrency(totalPurchaseValue)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-300 block">
                    {initialQuantity} un x {formatCurrency(unitCost)}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    ✓ Saída automática no Financeiro
                  </span>
                </div>
              </div>

              {/* Dates & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Fornecedor (Opcional)
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Distribuidora Farma..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Data de Entrada
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Validade do Lote
                  </label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-blue-glow transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirmar Entrada & Lançar no Financeiro</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Recent Stock Purchases History (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Histórico de Compras de Lotes</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {batches.length} entradas
              </span>
            </div>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {recentPurchases.map((batch) => {
                const totalCost = batch.initialQuantity * batch.unitCost;
                return (
                  <div 
                    key={batch.id}
                    className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{batch.vaccineName}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-mono">
                          <span>Lote: {batch.lotNumber}</span>
                          <span>•</span>
                          <span>{batch.manufacturer}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-xs text-slate-900 block">
                          {formatCurrency(totalCost)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {batch.initialQuantity} un. x {formatCurrency(batch.unitCost)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                      <span>Entrada: {formatDate(batch.entryDate)}</span>
                      <span>Validade: <strong className="text-slate-700">{formatDate(batch.expirationDate)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
