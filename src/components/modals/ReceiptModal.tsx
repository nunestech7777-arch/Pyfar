import React from 'react';
import { X, Printer, Copy, Check, Share2, Syringe, FileText, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Sale } from '../../types';
import { formatCurrency, formatDate, getPaymentMethodLabel, getSaleStatusBadge } from '../../utils/formatters';

export const ReceiptModal: React.FC = () => {
  const { viewingReceiptSale, setViewingReceiptSale, user, addToast } = useApp();
  const [copied, setCopied] = React.useState(false);

  if (!viewingReceiptSale) return null;

  const sale: Sale = viewingReceiptSale;
  const statusBadge = getSaleStatusBadge(sale);

  // Generate WhatsApp formatted text
  const generateWhatsAppText = () => {
    let text = `*COMPROVANTE DE PEDIDO / VENDA — ${user.companyName.toUpperCase()}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📄 *Pedido:* ${sale.saleNumber}\n`;
    text += `📅 *Data:* ${formatDate(sale.createdAt)}\n`;
    text += `👤 *Cliente:* ${sale.clientName}${sale.storeName ? ` (${sale.storeName})` : ''}\n\n`;
    text += `📦 *ITENS:* \n`;
    
    sale.items.forEach((item, idx) => {
      text += `${idx + 1}. *${item.vaccineName}* (Lote: ${item.lotNumber})\n`;
      text += `   • Quantidade: ${item.quantity} un x ${formatCurrency(item.unitPrice)} = *${formatCurrency(item.totalPrice)}*\n`;
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *VALOR TOTAL:* ${formatCurrency(sale.totalAmount)}\n`;
    if (sale.downPayment > 0) {
      text += `💵 *Entrada Paga:* ${formatCurrency(sale.downPayment)}\n`;
    }
    if (sale.remainingBalance > 0) {
      text += `⏳ *Saldo a Pagar:* ${formatCurrency(sale.remainingBalance)}\n`;
      text += `📆 *Vencimento:* ${formatDate(sale.dueDate)} (${sale.installmentsCount}x)\n`;
    }
    text += `💳 *Forma de Pagamento:* ${getPaymentMethodLabel(sale.paymentMethod)}\n`;
    text += `📌 *Status:* ${statusBadge.label}\n`;
    
    if (sale.notes) {
      text += `📝 *Obs:* ${sale.notes}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Obrigado pela preferência!`;

    return text;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('success', 'Copiado para o WhatsApp!', 'Texto do comprovante copiado para a área de transferência.');
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[95vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar (Hidden on print) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-t-3xl no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-sm text-slate-800">
              Comprovante de Venda ({sale.saleNumber})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsApp}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar WhatsApp'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={() => setViewingReceiptSale(null)}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800" id="printable-receipt">
          
          {/* Company Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Syringe className="w-4 h-4" />
                </div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  {user.companyName}
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Atacado e Distribuição de Vacinas Especializadas
              </p>
            </div>

            <div className="sm:text-right">
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                COMPROVANTE DE PEDIDO
              </div>
              <div className="text-lg font-mono font-black text-blue-600">
                {sale.saleNumber}
              </div>
              <div className="text-xs text-slate-500">
                Emitido em {formatDate(sale.createdAt)}
              </div>
            </div>
          </div>

          {/* Client & Payment Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="font-bold uppercase text-slate-400 text-[10px] block mb-1">
                Dados do Cliente
              </span>
              <p className="text-sm font-extrabold text-slate-900">{sale.clientName}</p>
              {sale.storeName && (
                <p className="text-slate-600 font-medium">{sale.storeName}</p>
              )}
            </div>

            <div className="sm:text-right">
              <span className="font-bold uppercase text-slate-400 text-[10px] block mb-1">
                Condições de Pagamento
              </span>
              <p className="font-bold text-slate-800">{getPaymentMethodLabel(sale.paymentMethod)}</p>
              <div className="mt-1">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.bg}`}>
                  {statusBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Products / Batches Table */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
              Discriminação dos Produtos
            </h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Produto</th>
                    <th className="p-3">Lote</th>
                    <th className="p-3 text-center">Quantidade</th>
                    <th className="p-3 text-right">Preço Unit.</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900">{item.vaccineName}</td>
                      <td className="p-3 font-mono text-slate-600 font-medium">{item.lotNumber}</td>
                      <td className="p-3 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="p-3 text-right text-slate-700">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Debt Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-5 rounded-2xl">
            <div className="text-xs space-y-1">
              <div className="text-slate-400">Total de Itens: <strong className="text-white">{sale.totalQuantity} un</strong></div>
              {sale.dueDate && (
                <div className="text-slate-400">
                  Data de Vencimento: <strong className="text-blue-300">{formatDate(sale.dueDate)}</strong> ({sale.installmentsCount}x)
                </div>
              )}
            </div>

            <div className="sm:text-right space-y-1 w-full sm:w-auto">
              <div className="flex sm:justify-end items-center gap-3 text-xs text-slate-300">
                <span>Valor Total:</span>
                <span className="text-base font-bold text-white">{formatCurrency(sale.totalAmount)}</span>
              </div>

              {sale.downPayment > 0 && (
                <div className="flex sm:justify-end items-center gap-3 text-xs text-emerald-400">
                  <span>Valor Entrada Pago:</span>
                  <span className="font-bold">-{formatCurrency(sale.downPayment)}</span>
                </div>
              )}

              {sale.remainingBalance > 0 ? (
                <div className="flex sm:justify-end items-center gap-3 pt-1 border-t border-slate-800 text-sm font-black text-rose-400">
                  <span>Saldo a Receber:</span>
                  <span>{formatCurrency(sale.remainingBalance)}</span>
                </div>
              ) : (
                <div className="flex sm:justify-end items-center gap-1.5 text-xs text-emerald-400 font-bold pt-1 border-t border-slate-800">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pedido 100% Quitado</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-0.5">Observações:</span>
              <p className="text-slate-600">{sale.notes}</p>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-200 text-center text-[11px] text-slate-400">
            Documento de controle e registro de entrega de mercadorias. PYFAR Distribuidora.
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden on print) */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-b-3xl no-print">
          <button
            onClick={() => setViewingReceiptSale(null)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Copiar p/ WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-blue-glow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
