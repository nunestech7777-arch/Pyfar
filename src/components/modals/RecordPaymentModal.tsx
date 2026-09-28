import React, { useState, useEffect } from 'react';
import { X, CheckCircle, CreditCard, DollarSign, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Sale, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  const { recordPayment, addToast } = useApp();

  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (sale) {
      setAmount(sale.remainingBalance);
      setNotes(`Recebimento ref. venda ${sale.saleNumber} - ${sale.clientName}`);
    }
  }, [sale]);

  if (!isOpen || !sale) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      addToast('error', 'Valor Inválido', 'O valor do pagamento deve ser maior que zero.');
      return;
    }

    recordPayment({
      saleId: sale.id,
      amount: Number(amount),
      paymentDate,
      paymentMethod,
      notes: notes.trim(),
    });

    onClose();
  };

  const remainingAfterPayment = Math.max(0, sale.remainingBalance - (Number(amount) || 0));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              Contas a Receber
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Registrar Pagamento de Cliente
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
          
          {/* Debt Summary Pill */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Cliente / Lojista:</span>
              <span className="font-bold text-white">{sale.clientName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Venda:</span>
              <span className="font-mono text-blue-300 font-bold">{sale.saleNumber}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Valor Total do Pedido:</span>
              <span className="text-slate-200">{formatCurrency(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Já Pago:</span>
              <span className="text-emerald-400 font-semibold">{formatCurrency(sale.paidAmount)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-rose-300 uppercase">Saldo Devedor Atual:</span>
              <span className="text-lg font-black text-rose-400">{formatCurrency(sale.remainingBalance)}</span>
            </div>
          </div>

          {/* Amount to Pay */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase text-emerald-900">
                Valor a Receber Agora (R$) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmount(sale.remainingBalance)}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                Quitar Tudo ({formatCurrency(sale.remainingBalance)})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-emerald-700 text-sm font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                max={sale.remainingBalance}
                value={amount || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                className="w-full bg-white border border-emerald-300 rounded-xl pl-10 pr-3 py-2.5 text-base font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                autoFocus
              />
            </div>
            
            {remainingAfterPayment === 0 ? (
              <p className="text-[11px] text-emerald-700 font-bold mt-2">
                ✓ A venda será marcada como 100% PAGA e a comissão será totalmente liberada.
              </p>
            ) : (
              <p className="text-[11px] text-slate-600 mt-2">
                Saldo restante após este pagamento: <strong>{formatCurrency(remainingAfterPayment)}</strong>
              </p>
            )}
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="transferencia">Transferência / TED</option>
                <option value="boleto">Boleto Bancário</option>
                <option value="cheque">Cheque</option>
                <option value="cartao">Cartão</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Data do Recebimento
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Observações do Pagamento
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Comprovante PIX enviado no WhatsApp"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Confirmar Recebimento</span>
          </button>
        </div>
      </div>
    </div>
  );
};
