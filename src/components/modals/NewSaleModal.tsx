import React, { useState, useEffect } from 'react';
import { toLocalISODate } from '../../utils/financeRules';
import { 
  X, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  CheckCircle,
  HelpCircle,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, isDateExpired } from '../../utils/formatters';
import { PaymentMethod } from '../../types';

interface SaleItemInput {
  batchId: string;
  quantity: number;
  unitPrice: number;
}

export const NewSaleModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { clients, batches, commissioners, addSale, addToast } = useApp();

  const [clientId, setClientId] = useState<string>('');
  const [items, setItems] = useState<SaleItemInput[]>([
    { batchId: '', quantity: 50, unitPrice: 0 }
  ]);
  const [paymentCondition, setPaymentCondition] = useState<'a_vista' | 'a_prazo'>('a_prazo');
  const [termPreset, setTermPreset] = useState<string>('7');
  const [customDays, setCustomDays] = useState<number>(7);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [downPayment, setDownPayment] = useState<number>(0);
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toLocalISODate(d);
  });
  const [notes, setNotes] = useState<string>('');

  // Expired batch warning modal state
  const [showExpiredWarning, setShowExpiredWarning] = useState<boolean>(false);
  const [expiredItemDetails, setExpiredItemDetails] = useState<string[]>([]);

  // Auto set initial client
  useEffect(() => {
    if (clients.length > 0 && !clientId) {
      setClientId(clients[0].id);
    }
  }, [clients, clientId]);

  const calculateDueDateFromDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + Number(days));
    return toLocalISODate(d);
  };

  const handlePaymentConditionChange = (cond: 'a_vista' | 'a_prazo', currentTotal: number) => {
    setPaymentCondition(cond);
    if (cond === 'a_vista') {
      setDownPayment(currentTotal);
      setDueDate(toLocalISODate());
    } else {
      if (downPayment >= currentTotal) {
        setDownPayment(0);
      }
      setTermPreset('7');
      setDueDate(calculateDueDateFromDays(7));
    }
  };

  const handleTermPresetChange = (preset: string) => {
    setTermPreset(preset);
    if (preset === '7') {
      setDueDate(calculateDueDateFromDays(7));
    } else if (preset === '14') {
      setDueDate(calculateDueDateFromDays(14));
    } else if (preset === '21') {
      setDueDate(calculateDueDateFromDays(21));
    } else if (preset === '30') {
      setDueDate(calculateDueDateFromDays(30));
    } else if (preset === 'custom') {
      setDueDate(calculateDueDateFromDays(customDays || 7));
    }
  };

  const handleCustomDaysChange = (days: number) => {
    setCustomDays(days);
    if (days > 0) {
      setDueDate(calculateDueDateFromDays(days));
    }
  };

  if (!isOpen) return null;

  const selectedClient = clients.find(c => c.id === clientId);
  const selectedCommissioner = selectedClient?.commissionerId
    ? commissioners.find(comm => comm.id === selectedClient.commissionerId)
    : undefined;

  // Active batches (exclude 0 qty)
  const availableBatches = batches.filter(b => b.currentQuantity > 0);

  const handleAddItem = () => {
    setItems(prev => [...prev, { batchId: '', quantity: 10, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof SaleItemInput, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto populate unitPrice if empty when selecting batch
      if (field === 'batchId') {
        const batch = batches.find(b => b.id === value);
        if (batch && updated[index].unitPrice === 0) {
          // Suggested default selling price: cost + 25-30%
          updated[index].unitPrice = Math.round(batch.unitCost * 1.25);
        }
      }
      return updated;
    });
  };

  // Calculations
  let totalQuantity = 0;
  let totalCost = 0;
  let totalAmount = 0;
  let totalGrossProfit = 0;

  const calculatedItems = items.map(it => {
    const batch = batches.find(b => b.id === it.batchId);
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const cost = batch ? batch.unitCost * qty : 0;
    const subtotal = price * qty;
    const unitProfit = batch ? price - batch.unitCost : 0;
    const grossProfit = subtotal - cost;

    totalQuantity += qty;
    totalCost += cost;
    totalAmount += subtotal;
    totalGrossProfit += grossProfit;

    return {
      ...it,
      batch,
      cost,
      subtotal,
      unitProfit,
      grossProfit,
      isExpired: batch ? isDateExpired(batch.expirationDate) : false,
    };
  });

  const remainingBalance = Math.max(0, totalAmount - (Number(downPayment) || 0));

  const handleCheckAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId) {
      addToast('error', 'Campos Obrigatórios', 'Selecione o cliente / lojista.');
      return;
    }

    if (items.length === 0 || items.some(it => !it.batchId || it.quantity <= 0)) {
      addToast('error', 'Itens Inválidos', 'Preencha todos os produtos, lotes e quantidades.');
      return;
    }

    // Check stock limit
    for (const it of items) {
      const batch = batches.find(b => b.id === it.batchId);
      if (batch && it.quantity > batch.currentQuantity) {
        addToast(
          'error',
          'Estoque Insuficiente',
          `O lote ${batch.lotNumber} (${batch.vaccineName}) só possui ${batch.currentQuantity} unidades disponíveis.`
        );
        return;
      }
    }

    // Check if any lot is expired
    const expiredBatches = calculatedItems.filter(it => it.isExpired && it.batch);
    if (expiredBatches.length > 0) {
      setExpiredItemDetails(
        expiredBatches.map(it => `${it.batch?.vaccineName} (Lote ${it.batch?.lotNumber} - Venceu em ${it.batch?.expirationDate})`)
      );
      setShowExpiredWarning(true);
      return;
    }

    executeSale();
  };

  const executeSale = () => {
    const result = addSale({
      clientId,
      items: items.map(it => ({
        batchId: it.batchId,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      })),
      paymentMethod,
      downPayment: Number(downPayment) || 0,
      installmentsCount: Number(installmentsCount) || 1,
      dueDate,
      notes,
    });

    if (result) {
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          
          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                Nova Venda
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                Registrar Venda para Atacado
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleCheckAndSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* 1. Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/40 p-4 rounded-2xl border border-blue-100/60">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Cliente / Lojista <span className="text-rose-500">*</span>
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione o comprador...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.storeName ? `— (${c.storeName})` : ''} {c.city ? `• ${c.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Commissioner Notification */}
              <div className="flex items-center">
                {selectedCommissioner ? (
                  <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl text-xs text-emerald-800 w-full">
                    <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Comissionador Vinculado:</span> {selectedCommissioner.name}
                      <p className="text-[11px] text-emerald-600">
                        Comissão: R$ {selectedCommissioner.defaultRatePerUnit.toFixed(2)} por unidade vendida.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic p-3 bg-slate-100/70 rounded-xl w-full">
                    Cliente direto sem comissionador vinculado.
                  </div>
                )}
              </div>
            </div>

            {/* 2. Items & Lots */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Vacinas e Lotes da Venda</h3>
                  <p className="text-xs text-slate-500">Selecione os lotes que serão baixados do estoque</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Adicionar Produto / Lote</span>
                </button>
              </div>

              <div className="space-y-3">
                {calculatedItems.map((item, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.isExpired 
                        ? 'bg-rose-50/50 border-rose-200' 
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      
                      {/* Batch Selector */}
                      <div className="md:col-span-5">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Vacina / Lote / Validade
                        </label>
                        <select
                          value={item.batchId}
                          onChange={(e) => handleItemChange(index, 'batchId', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Selecione o lote do estoque...</option>
                          {availableBatches.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.vaccineName} | Lote: {b.lotNumber} | Disp: {b.currentQuantity} un. | Custo: R$ {b.unitCost.toFixed(2)} | Val: {b.expirationDate}
                            </option>
                          ))}
                        </select>
                        {item.isExpired && (
                          <div className="flex items-center gap-1 text-[11px] text-rose-600 font-bold mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            Lote com data de validade vencida!
                          </div>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="1"
                          max={item.batch ? item.batch.currentQuantity : undefined}
                          value={item.quantity || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? 0 : e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        {item.batch && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Max: {item.batch.currentQuantity} un.
                          </span>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Preço Venda (un.)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-slate-400 text-xs">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={item.unitPrice || ''}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value === '' ? 0 : e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-2 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        {item.batch && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Custo: R$ {item.batch.unitCost.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Profit Preview & Subtotal */}
                      <div className="md:col-span-2 text-right">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Subtotal
                        </label>
                        <div className="text-sm font-extrabold text-blue-700">
                          {formatCurrency(item.subtotal)}
                        </div>
                        {item.batch && (
                          <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
                            Lucro: +{formatCurrency(item.grossProfit)}
                          </div>
                        )}
                      </div>

                      {/* Delete Button */}
                      <div className="md:col-span-1 flex justify-end">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Remover este item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Summary Pill / Profit Calculation Banner */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 sm:p-5 rounded-2xl shadow-lg grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase">Quantidade Total</span>
                <div className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                  {totalQuantity} un
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase">Custo Total Estoque</span>
                <div className="text-lg sm:text-xl font-bold text-slate-300 mt-0.5">
                  {formatCurrency(totalCost)}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-emerald-400 uppercase">Lucro Bruto Previsto</span>
                <div className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-0.5 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {formatCurrency(totalGrossProfit)}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-blue-300 uppercase">Valor Total Venda</span>
                <div className="text-xl sm:text-2xl font-black text-blue-400 mt-0.5">
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>

            {/* 4. Forma e Condição de Pagamento (Nova Regra: A Prazo 7 dias Padrão) */}
            <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                    Condição Comercial
                  </span>
                  <h4 className="text-sm font-black text-slate-900">Forma e Prazo de Pagamento</h4>
                </div>

                {/* Toggle: [ À Vista ] [ A Prazo ] */}
                <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handlePaymentConditionChange('a_vista', totalAmount)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      paymentCondition === 'a_vista'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    À Vista (100% no Ato)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentConditionChange('a_prazo', totalAmount)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      paymentCondition === 'a_prazo'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    A Prazo (Padrão: 7 dias)
                  </button>
                </div>
              </div>

              {/* SE FOR À VISTA */}
              {paymentCondition === 'a_vista' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Forma de Recebimento
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pix">PIX (Imediato)</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="transferencia">Transferência / TED</option>
                        <option value="cartao">Cartão de Débito/Crédito</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Valor Recebido no Caixa
                      </label>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-emerald-700">
                        {formatCurrency(totalAmount)} (100% Pago)
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl flex items-center gap-2 text-xs text-emerald-900">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Venda liquidada integralmente no ato. Nenhum valor pendente em Contas a Receber.</span>
                  </div>
                </div>
              ) : (
                /* SE FOR A PRAZO */
                <div className="space-y-4">
                  
                  {/* Grid: Forma, Entrada, Prazo Preset, Vencimento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    
                    {/* Forma de Pagamento */}
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

                    {/* Entrada (R$) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase text-slate-700">
                          Valor de Entrada (R$)
                        </label>
                        {downPayment > 0 && (
                          <button
                            type="button"
                            onClick={() => setDownPayment(0)}
                            className="text-[10px] text-rose-600 font-bold hover:underline"
                          >
                            Zerar
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-bold">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={totalAmount}
                          value={downPayment || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            if (val >= 0 && val <= totalAmount) {
                              setDownPayment(val);
                            } else if (val < 0) {
                              setDownPayment(0);
                            }
                          }}
                          placeholder="0,00"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-2 py-2 text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Prazo Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Prazo Comercial
                      </label>
                      <select
                        value={termPreset}
                        onChange={(e) => handleTermPresetChange(e.target.value)}
                        className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      >
                        <option value="7">7 dias (Padrão Comercial)</option>
                        <option value="14">14 dias</option>
                        <option value="21">21 dias</option>
                        <option value="30">30 dias</option>
                        <option value="custom">Personalizado...</option>
                      </select>
                    </div>

                    {/* Vencimento */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Data de Vencimento
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => {
                          setDueDate(e.target.value);
                          setTermPreset('custom');
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Custom Days Input if custom is chosen */}
                  {termPreset === 'custom' && (
                    <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100 flex items-center gap-3 text-xs">
                      <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="font-bold text-blue-900">Prazo Personalizado em Dias:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={customDays}
                          onChange={(e) => handleCustomDaysChange(Number(e.target.value))}
                          className="w-20 bg-white border border-blue-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-slate-600 font-medium">dias após a data da venda</span>
                      </div>
                    </div>
                  )}

                  {/* Quick Down Payment Presets */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Atalhos de Entrada:</span>
                    {[
                      { label: 'Sem Entrada (100% Prazo)', pct: 0 },
                      { label: '20% Entrada', pct: 0.2 },
                      { label: '30% Entrada', pct: 0.3 },
                      { label: '50% Entrada', pct: 0.5 },
                    ].map((shortcut, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDownPayment(Math.round(totalAmount * shortcut.pct))}
                        className="bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-700 font-bold px-2.5 py-1 rounded-lg text-[11px] transition-all"
                      >
                        {shortcut.label}
                      </button>
                    ))}
                  </div>

                  {/* Real-time Calculation Summary Bar */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor Total</span>
                      <strong className="text-sm sm:text-base font-black text-slate-900">{formatCurrency(totalAmount)}</strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-emerald-600 uppercase font-bold block">Entrada no Caixa</span>
                      <strong className="text-sm sm:text-base font-black text-emerald-600">{formatCurrency(downPayment)}</strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-amber-600 uppercase font-bold block">Saldo a Receber</span>
                      <strong className="text-sm sm:text-base font-black text-amber-600">{formatCurrency(remainingBalance)}</strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-blue-600 uppercase font-bold block">Status Previsto</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                        remainingBalance <= 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : downPayment > 0
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {remainingBalance <= 0 ? 'Pago' : downPayment > 0 ? 'Parcial' : 'A Receber'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Observações da Venda (Opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ex: 'Paulo pegou 200 vacinas — 50% de entrada, entrega via van refrigerada amanhã cedo...'"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleCheckAndSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-blue-glow transition-all flex items-center gap-2 active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Concluir Venda & Baixar Estoque</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expired Lot Confirmation Warning Modal */}
      {showExpiredWarning && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-rose-500 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-2">
              Atenção: Este lote está vencido!
            </h3>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Você selecionou um ou mais lotes com validade expirada:
            </p>

            <ul className="bg-rose-50 rounded-xl p-3 text-xs text-rose-800 space-y-1 mb-5 font-semibold">
              {expiredItemDetails.map((det, i) => (
                <li key={i}>• {det}</li>
              ))}
            </ul>

            <p className="text-xs font-bold text-slate-800 mb-5">
              Deseja continuar e realizar a venda mesmo assim?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExpiredWarning(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Voltar e Corrigir
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExpiredWarning(false);
                  executeSale();
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md"
              >
                Sim, Continuar Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
