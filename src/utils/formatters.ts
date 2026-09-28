export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const isDateExpired = (expirationDate: string): boolean => {
  if (!expirationDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate);
  return exp < today;
};

export const isDateNearExpiry = (expirationDate: string, daysThreshold: number = 45): boolean => {
  if (!expirationDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate);
  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysThreshold;
};

export const getDaysOverdue = (dueDate: string): number => {
  if (!dueDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case 'pago':
      return { label: 'Pago', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'parcialmente_pago':
      return { label: 'Parcial', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'pendente':
      return { label: 'A Receber', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'atrasado':
      return { label: 'Vencido', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'cancelado':
      return { label: 'Cancelado', bg: 'bg-slate-50 text-slate-500 border-slate-200' };
    default:
      return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
};

export const getCommissionStatusBadge = (status: string) => {
  switch (status) {
    case 'paga':
      return { label: 'Paga', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'liberada':
      return { label: 'Liberada p/ Pagamento', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'parcialmente_liberada':
      return { label: 'Parcialmente Liberada', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'pendente':
      return { label: 'Pendente (Aguard. Cliente)', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    case 'cancelada':
      return { label: 'Cancelada', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
};

export const getPaymentMethodLabel = (method: string): string => {
  const map: Record<string, string> = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    transferencia: 'TED / Transferência',
    boleto: 'Boleto Bancário',
    cheque: 'Cheque',
    cartao: 'Cartão',
  };
  return map[method] || method;
};
