import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  PlusCircle, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Building2, 
  Trash2, 
  Edit3, 
  ShieldAlert,
  ArrowUpDown,
  DollarSign
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, isDateExpired, isDateNearExpiry } from '../utils/formatters';
import { VaccineBatch } from '../types';

export const StockPage: React.FC<{ onOpenNewBatch: () => void; onAdjustStock: (batch: VaccineBatch) => void }> = ({ onOpenNewBatch, onAdjustStock }) => {
  const { batches, deleteBatch, globalSearch } = useApp();
  
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'baixo' | 'vencendo' | 'vencido' | 'esgotado'>('todos');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'expiry' | 'cost'>('name');

  const searchQuery = globalSearch || localSearch;

  // Filter batches
  const filteredBatches = batches.filter(batch => {
    // Search query
    const matchesSearch = 
      batch.vaccineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (batch.supplier && batch.supplier.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Status filter
    const isExp = isDateExpired(batch.expirationDate);
    const isNear = isDateNearExpiry(batch.expirationDate);
    const isLow = batch.currentQuantity > 0 && batch.currentQuantity <= 30;
    const isOut = batch.currentQuantity === 0;

    if (statusFilter === 'ativo') return batch.currentQuantity > 0 && !isExp;
    if (statusFilter === 'baixo') return isLow;
    if (statusFilter === 'vencendo') return isNear && batch.currentQuantity > 0;
    if (statusFilter === 'vencido') return isExp;
    if (statusFilter === 'esgotado') return isOut;

    return true;
  });

  // Sort batches
  const sortedBatches = [...filteredBatches].sort((a, b) => {
    if (sortBy === 'name') return a.vaccineName.localeCompare(b.vaccineName);
    if (sortBy === 'quantity') return b.currentQuantity - a.currentQuantity;
    if (sortBy === 'expiry') return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
    if (sortBy === 'cost') return b.unitCost - a.unitCost;
    return 0;
  });

  // Metrics
  const totalDoses = batches.reduce((acc, b) => acc + b.currentQuantity, 0);
  const totalCostValue = batches.reduce((acc, b) => acc + (b.currentQuantity * b.unitCost), 0);
  const lowStockCount = batches.filter(b => b.currentQuantity > 0 && b.currentQuantity <= 30).length;
  const expiredCount = batches.filter(b => isDateExpired(b.expirationDate) && b.currentQuantity > 0).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Estoque
            </h1>
            <span className="text-xs font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              {batches.length} lotes cadastrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle independente de quantidade, preço de custo unitário e validade para cada lote.
          </p>
        </div>

        <button
          onClick={onOpenNewBatch}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-blue-glow transition-all flex items-center gap-2 active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Nova Entrada de Lote</span>
        </button>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-slate-400">Quantidade Disponível</span>
          <div className="text-xl font-black text-slate-900 mt-0.5">{totalDoses} un</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-slate-400">Valor em Custo</span>
          <div className="text-xl font-black text-blue-700 mt-0.5">{formatCurrency(totalCostValue)}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-amber-500">Estoque Baixo (≤30)</span>
          <div className="text-xl font-black text-amber-600 mt-0.5">{lowStockCount} lotes</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[11px] font-bold uppercase text-rose-500">Lotes Vencidos</span>
          <div className="text-xl font-black text-rose-600 mt-0.5">{expiredCount} lotes</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar por produto, lote, fabricante..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'ativo', label: 'Disponíveis' },
            { id: 'baixo', label: 'Estoque Baixo' },
            { id: 'vencendo', label: 'Vencendo Logo' },
            { id: 'vencido', label: 'Vencidos' },
            { id: 'esgotado', label: 'Esgotados' },
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

      {/* Batches Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Produto & Fabricante</th>
                <th className="p-3.5">Lote</th>
                <th className="p-3.5 text-center">Quantidade Disponível</th>
                <th className="p-3.5 text-right">Custo Unitário</th>
                <th className="p-3.5 text-right">Valor Total Custo</th>
                <th className="p-3.5">Data Entrada</th>
                <th className="p-3.5">Validade</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                    Nenhum lote encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                sortedBatches.map((batch) => {
                  const isExp = isDateExpired(batch.expirationDate);
                  const isNear = isDateNearExpiry(batch.expirationDate);
                  const isLow = batch.currentQuantity > 0 && batch.currentQuantity <= 30;
                  const isOut = batch.currentQuantity === 0;

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Manufacturer */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 text-sm">{batch.vaccineName}</div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{batch.manufacturer}</span>
                          {batch.supplier && <span>• {batch.supplier}</span>}
                        </div>
                      </td>

                      {/* Lot Number */}
                      <td className="p-3.5">
                        <span className="font-mono font-bold bg-slate-100 text-slate-800 px-2 py-1 rounded-lg border border-slate-200">
                          {batch.lotNumber}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="p-3.5 text-center">
                        <div className="text-sm font-black text-slate-900">
                          {batch.currentQuantity} <span className="text-[10px] text-slate-400 font-normal">/ {batch.initialQuantity}</span>
                        </div>
                        {isLow && (
                          <span className="text-[10px] font-bold text-amber-600 block mt-0.5">
                            Estoque Baixo
                          </span>
                        )}
                      </td>

                      {/* Unit Cost */}
                      <td className="p-3.5 text-right font-bold text-slate-800">
                        {formatCurrency(batch.unitCost)}
                      </td>

                      {/* Total Cost Value */}
                      <td className="p-3.5 text-right font-black text-blue-700">
                        {formatCurrency(batch.currentQuantity * batch.unitCost)}
                      </td>

                      {/* Entry Date */}
                      <td className="p-3.5 text-slate-600">
                        {formatDate(batch.entryDate)}
                      </td>

                      {/* Expiration Date */}
                      <td className="p-3.5">
                        <div className={`font-bold ${
                          isExp 
                            ? 'text-rose-600 flex items-center gap-1' 
                            : isNear 
                              ? 'text-amber-600 flex items-center gap-1' 
                              : 'text-slate-700'
                        }`}>
                          {isExp && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}
                          {isNear && <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                          <span>{formatDate(batch.expirationDate)}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5 text-center">
                        {isOut ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Esgotado
                          </span>
                        ) : isExp ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                            Vencido
                          </span>
                        ) : isNear ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Vence em breve
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Ativo
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onAdjustStock(batch)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Ajustar estoque"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deseja remover o lote ${batch.lotNumber} (${batch.vaccineName})?`)) {
                                deleteBatch(batch.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Excluir lote"
                          >
                            <Trash2 className="w-4 h-4" />
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
