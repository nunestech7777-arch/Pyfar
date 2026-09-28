import React, { useEffect, useMemo, useState } from 'react';
import { X, SlidersHorizontal, PlusCircle, MinusCircle, ClipboardList, CheckCircle, Building2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VaccineBatch, StockAdjustmentReason, StockAdjustmentType } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: VaccineBatch | null;
}

const REASON_OPTIONS: { value: StockAdjustmentReason; label: string }[] = [
  { value: 'entrada_nao_registrada', label: 'Entrada não registrada' },
  { value: 'erro_contagem', label: 'Erro de contagem' },
  { value: 'correcao_lancamento', label: 'Correção de lançamento' },
  { value: 'perda_avaria', label: 'Perda / avaria' },
  { value: 'produto_encontrado', label: 'Produto encontrado no estoque' },
  { value: 'inventario_fisico', label: 'Inventário físico' },
  { value: 'divergencia_estoque', label: 'Divergência de estoque' },
  { value: 'outro', label: 'Outro' },
];

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({ isOpen, onClose, batch }) => {
  const { adjustStock, stockAdjustments } = useApp();

  const [type, setType] = useState<StockAdjustmentType>('adicionar');
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [reason, setReason] = useState<StockAdjustmentReason>('entrada_nao_registrada');
  const [customReason, setCustomReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (batch) {
      setType('adicionar');
      setQuantityInput('');
      setReason('entrada_nao_registrada');
      setCustomReason('');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [batch]);

  const recentAdjustments = useMemo(() => {
    if (!batch) return [];
    return stockAdjustments.filter(a => a.batchId === batch.id).slice(0, 5);
  }, [stockAdjustments, batch]);

  if (!isOpen || !batch) return null;

  const parsedQuantity = quantityInput.trim() === '' ? null : Number(quantityInput);
  const isValidNumber = parsedQuantity !== null && Number.isFinite(parsedQuantity) && Number.isInteger(parsedQuantity);

  let previewQuantity = batch.currentQuantity;
  let previewDelta = 0;
  if (isValidNumber && parsedQuantity !== null) {
    if (type === 'adicionar') {
      previewQuantity = batch.currentQuantity + parsedQuantity;
      previewDelta = parsedQuantity;
    } else if (type === 'remover') {
      previewQuantity = batch.currentQuantity - parsedQuantity;
      previewDelta = -parsedQuantity;
    } else {
      previewQuantity = parsedQuantity;
      previewDelta = parsedQuantity - batch.currentQuantity;
    }
  }

  const reasonLabel = reason === 'outro' ? customReason.trim() : (REASON_OPTIONS.find(r => r.value === reason)?.label || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (parsedQuantity === null) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = adjustStock({
        batchId: batch.id,
        type,
        quantity: parsedQuantity,
        reason,
        reasonLabel,
        notes: notes.trim() || undefined,
      });
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    isValidNumber &&
    parsedQuantity !== null &&
    (type === 'definir' ? parsedQuantity >= 0 : parsedQuantity > 0) &&
    (type !== 'remover' || parsedQuantity <= batch.currentQuantity) &&
    previewQuantity >= 0 &&
    previewDelta !== 0 &&
    reasonLabel.length > 0 &&
    !isSubmitting;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Estoque
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Ajustar Estoque
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

          {/* Lote Summary Pill */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2">
            <div className="flex justify-between items-start text-xs">
              <div>
                <div className="font-extrabold text-white text-sm">{batch.vaccineName}</div>
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                  <Building2 className="w-3 h-3" />
                  <span>{batch.manufacturer}</span>
                </div>
              </div>
              <span className="font-mono font-bold bg-slate-800 text-blue-300 px-2 py-1 rounded-lg border border-slate-700">
                {batch.lotNumber}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300 uppercase">Estoque Atual:</span>
              <span className="text-lg font-black text-white">{batch.currentQuantity} un</span>
            </div>
          </div>

          {/* Tipo de Ajuste */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Tipo de Ajuste <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('adicionar')}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                  type === 'adicionar'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => setType('remover')}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                  type === 'remover'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <MinusCircle className="w-4 h-4" />
                Remover
              </button>
              <button
                type="button"
                onClick={() => setType('definir')}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                  type === 'definir'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Definir Qtd.
              </button>
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              {type === 'definir' ? 'Nova Quantidade Total (un)' : 'Quantidade (un)'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="1"
              min={type === 'definir' ? 0 : 1}
              placeholder={type === 'definir' ? String(batch.currentQuantity) : '0'}
              value={quantityInput}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setQuantityInput(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-base font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
            {quantityInput.trim() !== '' && !isValidNumber && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1.5">
                Informe um número inteiro válido (sem casas decimais).
              </p>
            )}
          </div>

          {/* Preview */}
          <div className={`p-4 rounded-2xl border ${
            isValidNumber && previewQuantity < 0
              ? 'bg-rose-50 border-rose-200'
              : 'bg-blue-50/60 border-blue-100'
          }`}>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Estoque Atual</div>
                <div className="text-base font-black text-slate-800 mt-0.5">{batch.currentQuantity}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Ajuste</div>
                <div className={`text-base font-black mt-0.5 ${previewDelta > 0 ? 'text-emerald-600' : previewDelta < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {isValidNumber ? `${previewDelta > 0 ? '+' : ''}${previewDelta}` : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Novo Estoque</div>
                <div className={`text-base font-black mt-0.5 ${isValidNumber && previewQuantity < 0 ? 'text-rose-600' : 'text-blue-700'}`}>
                  {isValidNumber ? previewQuantity : '—'}
                </div>
              </div>
            </div>
            {isValidNumber && previewQuantity < 0 && (
              <p className="text-[11px] text-rose-600 font-bold mt-2 text-center">
                O estoque não pode ficar negativo.
              </p>
            )}
            {isValidNumber && type === 'remover' && parsedQuantity !== null && parsedQuantity > batch.currentQuantity && (
              <p className="text-[11px] text-rose-600 font-bold mt-2 text-center">
                Não é possível remover mais do que o estoque atual ({batch.currentQuantity} un).
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Motivo do Ajuste <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {REASON_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {reason === 'outro' && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Descreva o motivo do ajuste..."
                className="w-full mt-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
          </div>

          {/* Observação */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Observação <span className="text-slate-400 normal-case font-medium">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Foram encontradas 10 unidades que chegaram no lote anterior e não haviam sido cadastradas."
              rows={2}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Histórico recente do lote */}
          {recentAdjustments.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                <ClipboardList className="w-3.5 h-3.5" />
                Ajustes Recentes Deste Lote
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {recentAdjustments.map(adj => (
                  <div key={adj.id} className="flex items-center justify-between text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`font-black flex-shrink-0 ${adj.adjustmentQuantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {adj.adjustmentQuantity > 0 ? '+' : ''}{adj.adjustmentQuantity}
                      </span>
                      <span className="text-slate-500 truncate">{adj.reasonLabel} • {adj.userName}</span>
                    </div>
                    <span className="text-slate-400 flex-shrink-0 ml-2">{formatDateTime(adj.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Ajustando...' : 'Confirmar Ajuste'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
