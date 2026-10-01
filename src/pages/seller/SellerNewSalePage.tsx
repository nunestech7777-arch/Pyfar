import React, { useMemo, useState } from 'react';
import { Plus, Trash2, CheckCircle, UserPlus } from 'lucide-react';
import { useSeller } from '../../context/SellerContext';
import { useApp } from '../../context/AppContext';
import { SellerClientModal } from '../../components/seller/SellerClientModal';
import { PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { toLocalISODate } from '../../utils/financeRules';

interface ItemInput {
  product: string;
  quantity: number;
  unitPrice: number;
}

const TERM_PRESETS = ['7', '14', '21', '30'];

const dueDateIn = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
};

// Nova venda do vendedor: só produto, quantidade e preço — sem lote, custo ou lucro.
// O servidor escolhe os lotes (validade mais próxima) e revalida estoque e valores.
export const SellerNewSalePage: React.FC = () => {
  const { addToast } = useApp();
  const { data, createSale, setModule } = useSeller();
  const [clientId, setClientId] = useState('');
  const [items, setItems] = useState<ItemInput[]>([{ product: '', quantity: 1, unitPrice: 0 }]);
  const [condition, setCondition] = useState<'a_vista' | 'a_prazo'>('a_prazo');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [downPayment, setDownPayment] = useState(0);
  const [termPreset, setTermPreset] = useState('7');
  const [dueDate, setDueDate] = useState(() => dueDateIn(7));
  const [notes, setNotes] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const products = useMemo(() => (data?.products ?? []).filter(p => p.available > 0), [data]);
  if (!data) return null;

  const totalAmount = items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const effectiveDown = condition === 'a_vista' ? totalAmount : Math.min(downPayment, totalAmount);
  const remaining = Math.max(0, totalAmount - effectiveDown);

  const updateItem = (index: number, patch: Partial<ItemInput>) =>
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const availableFor = (name: string) => products.find(p => p.name === name)?.available ?? 0;

  const handleTerm = (preset: string) => {
    setTermPreset(preset);
    if (preset !== 'custom') setDueDate(dueDateIn(Number(preset)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!clientId) {
      addToast('error', 'Campos obrigatórios', 'Selecione o cliente.');
      return;
    }
    if (items.some(it => !it.product || !(Number(it.quantity) > 0) || !(Number(it.unitPrice) > 0))) {
      addToast('error', 'Itens inválidos', 'Preencha produto, quantidade e preço de todos os itens.');
      return;
    }
    if (condition === 'a_prazo' && downPayment > totalAmount) {
      addToast('error', 'Entrada inválida', 'A entrada não pode ser maior que o total da venda.');
      return;
    }
    // Soma por produto (o mesmo produto pode estar em mais de uma linha)
    const totals = new Map<string, number>();
    items.forEach(it => totals.set(it.product, (totals.get(it.product) ?? 0) + Number(it.quantity)));
    for (const [name, qty] of totals) {
      if (qty > availableFor(name)) {
        addToast('error', 'Estoque insuficiente', `${name}: disponível ${availableFor(name)} un.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const sale = await createSale({
        clientId,
        items: items.map(it => ({ product: it.product, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
        paymentMethod,
        downPayment: Number(effectiveDown.toFixed(2)),
        installmentsCount: 1,
        dueDate: condition === 'a_vista' ? toLocalISODate() : dueDate,
        notes: notes.trim() || undefined,
      });
      if (sale) setModule('minhas_vendas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1';

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl">
      {/* Cliente */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className={labelClass}>Cliente <span className="text-rose-500">*</span></label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className={inputClass} required>
              <option value="">Selecione o cliente...</option>
              {data.clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.storeName ? ` — ${c.storeName}` : ''}{c.city ? ` • ${c.city}` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setIsClientModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" /> Novo cliente
          </button>
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Produtos</h3>
          <button
            type="button"
            onClick={() => setItems(prev => [...prev, { product: '', quantity: 1, unitPrice: 0 }])}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar produto
          </button>
        </div>

        {products.length === 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
            Nenhum produto disponível para venda no momento.
          </p>
        )}

        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 rounded-2xl bg-slate-50/70 border border-slate-200">
            <div className="sm:col-span-5">
              <label className={labelClass}>Produto</label>
              <select value={item.product} onChange={e => updateItem(index, { product: e.target.value })} className={inputClass} required>
                <option value="">Selecione...</option>
                {products.map(p => (
                  <option key={p.name} value={p.name}>{p.name} — {p.available} un. disponíveis</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Quantidade</label>
              <input
                type="number"
                min={1}
                step={1}
                max={item.product ? availableFor(item.product) : undefined}
                value={item.quantity || ''}
                onFocus={e => e.target.select()}
                onChange={e => updateItem(index, { quantity: e.target.value === '' ? 0 : Number(e.target.value) })}
                className={inputClass}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Preço (un.)</label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={item.unitPrice || ''}
                onFocus={e => e.target.select()}
                onChange={e => updateItem(index, { unitPrice: e.target.value === '' ? 0 : Number(e.target.value) })}
                placeholder="0,00"
                className={inputClass}
                required
              />
            </div>
            <div className="sm:col-span-2 text-right">
              <span className={labelClass}>Subtotal</span>
              <div className="text-sm font-extrabold text-blue-700 py-2.5">
                {formatCurrency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
              </div>
            </div>
            <div className="sm:col-span-1 flex justify-end">
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => setItems(prev => prev.filter((_, i) => i !== index))}
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                  title="Remover item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagamento */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">Pagamento</h3>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setCondition('a_vista')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${condition === 'a_vista' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
            >
              À vista
            </button>
            <button
              type="button"
              onClick={() => { setCondition('a_prazo'); handleTerm('7'); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${condition === 'a_prazo' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
            >
              A prazo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Forma de pagamento</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className={inputClass}>
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="transferencia">Transferência / TED</option>
              <option value="cartao">Cartão</option>
              {condition === 'a_prazo' && <option value="boleto">Boleto</option>}
              {condition === 'a_prazo' && <option value="cheque">Cheque</option>}
            </select>
          </div>

          {condition === 'a_prazo' && (
            <>
              <div>
                <label className={labelClass}>Entrada (R$)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  max={totalAmount}
                  value={downPayment || ''}
                  onFocus={e => e.target.select()}
                  onChange={e => setDownPayment(Math.max(0, e.target.value === '' ? 0 : Number(e.target.value)))}
                  placeholder="0,00 (sem entrada)"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Prazo</label>
                <div className="flex gap-1">
                  {TERM_PRESETS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleTerm(p)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border ${
                        termPreset === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      {p}d
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Vencimento</label>
                <input
                  type="date"
                  value={dueDate}
                  min={toLocalISODate()}
                  onChange={e => { setDueDate(e.target.value); setTermPreset('custom'); }}
                  className={inputClass}
                  required
                />
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-2xl p-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Total</span>
            <strong className="text-base font-black text-slate-900">{formatCurrency(totalAmount)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-emerald-600 uppercase font-bold block">Recebido agora</span>
            <strong className="text-base font-black text-emerald-600">{formatCurrency(effectiveDown)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-amber-600 uppercase font-bold block">Pendente</span>
            <strong className="text-base font-black text-amber-600">{formatCurrency(remaining)}</strong>
          </div>
        </div>
        {condition === 'a_prazo' && downPayment > totalAmount && (
          <p className="text-[11px] text-rose-600 font-semibold">A entrada não pode ser maior que o total da venda.</p>
        )}

        <div>
          <label className={labelClass}>Observações (opcional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={1000} className={inputClass} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || products.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-blue-glow flex items-center gap-2 active:scale-95"
        >
          <CheckCircle className="w-4 h-4" />
          {isSubmitting ? 'Registrando...' : 'Concluir venda'}
        </button>
      </div>
    </form>

    {/* Fora do <form> da venda: o modal tem o próprio formulário */}
    <SellerClientModal
      isOpen={isClientModalOpen}
      onClose={() => setIsClientModalOpen(false)}
      onSaved={client => setClientId(client.id)}
    />
    </>
  );
};
