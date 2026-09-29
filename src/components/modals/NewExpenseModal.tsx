import React, { useState } from 'react';
import { toLocalISODate } from '../../utils/financeRules';
import { X, Receipt, CheckCircle, DollarSign } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FinancialCategory } from '../../types';

export const NewExpenseModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { addManualExpense, addToast } = useApp();

  const [category, setCategory] = useState<FinancialCategory>('frete');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(() => toLocalISODate());

  if (!isOpen) return null;

  const categoryLabels: Record<FinancialCategory, string> = {
    frete: 'Frete e Cadeia Fria',
    transporte: 'Transporte e Logística',
    combustivel: 'Combustível',
    aluguel: 'Aluguel do Galpão / Câmaras Frias',
    pro_labore: 'Pró-labore do Administrador',
    contas_empresa: 'Contas da Empresa (Luz, Internet, Água)',
    taxas: 'Taxas Bancárias e Impostos',
    outras_despesas: 'Outras Despesas Operacionais',
    venda_a_vista: 'Venda à Vista',
    entrada_venda: 'Entrada de Venda',
    recebimento_parcela: 'Recebimento de Parcela',
    outra_entrada: 'Outra Entrada',
    compra_estoque: 'Compra de Estoque',
    comissao_paga: 'Comissão Paga',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      addToast('error', 'Descrição Obrigatória', 'Informe a descrição da despesa.');
      return;
    }

    if (amount <= 0) {
      addToast('error', 'Valor Inválido', 'O valor deve ser maior que zero.');
      return;
    }

    addManualExpense({
      category,
      categoryLabel: categoryLabels[category] || 'Despesa',
      description: description.trim(),
      amount: Number(amount),
      date,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
              Financeiro
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Nova Saída / Despesa Manual
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
          
          {/* Categoria */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Categoria da Despesa <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FinancialCategory)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="frete">Frete e Cadeia Fria Refrigerada</option>
              <option value="combustivel">Combustível e Entregas</option>
              <option value="aluguel">Aluguel do Depósito Climatizado</option>
              <option value="pro_labore">Pró-labore do Administrador</option>
              <option value="contas_empresa">Contas da Empresa (Energia/Gerador, Internet)</option>
              <option value="taxas">Taxas Bancárias / Impostos</option>
              <option value="transporte">Transporte & Logística Externa</option>
              <option value="outras_despesas">Outras Despesas Operacionais</option>
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Descrição do Pagamento <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Abastecimento van refrigerada, Frete carga GSK..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Valor da Despesa (R$) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={amount || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Data do Pagamento <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
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
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Salvar Despesa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
