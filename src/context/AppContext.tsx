import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toLocalISODate, getDaysOverdue, applySaleReversals } from '../utils/financeRules';
import { formatCurrency } from '../utils/formatters';
import confetti from 'canvas-confetti';
import {
  NavigationModule,
  Client,
  VaccineBatch,
  Sale,
  Commissioner,
  CommissionEntry,
  FinancialTransaction,
  PaymentRecord,
  StockAdjustment,
  StockAdjustmentType,
  StockAdjustmentReason,
  User,
  ToastMessage,
  PaymentMethod,
  FinancialCategory
} from '../types';
import { supabase } from '../services/supabase';
import { cloudStorage, emptyUserData, UserData } from '../services/cloudStorage';
import { initialUser } from '../data/initialData';

interface AppContextType {
  user: User;
  isLoggedIn: boolean;
  isLoadingSession: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  
  currentModule: NavigationModule;
  setCurrentModule: (mod: NavigationModule) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;

  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Batches (Estoque)
  batches: VaccineBatch[];
  addBatch: (batch: Omit<VaccineBatch, 'id' | 'createdAt' | 'currentQuantity' | 'status'>) => VaccineBatch;
  updateBatch: (id: string, batch: Partial<VaccineBatch>) => void;
  deleteBatch: (id: string) => void;

  // Ajustes manuais de estoque (histórico e auditoria)
  stockAdjustments: StockAdjustment[];
  adjustStock: (data: {
    batchId: string;
    type: StockAdjustmentType;
    quantity: number;
    reason: StockAdjustmentReason;
    reasonLabel: string;
    notes?: string;
  }) => boolean;

  // Sales (Vendas)
  sales: Sale[];
  addSale: (saleData: {
    clientId: string;
    items: Array<{
      batchId: string;
      quantity: number;
      unitPrice: number;
    }>;
    paymentMethod: PaymentMethod;
    downPayment: number;
    installmentsCount: number;
    dueDate: string;
    notes?: string;
  }) => Sale | null;
  cancelSale: (id: string) => void;

  // Commissioners & Map
  commissioners: Commissioner[];
  addCommissioner: (comm: Omit<Commissioner, 'id' | 'createdAt'>) => Commissioner;
  updateCommissioner: (id: string, comm: Partial<Commissioner>) => void;
  deleteCommissioner: (id: string) => void;

  commissions: CommissionEntry[];
  payCommission: (id: string) => void;

  // Contas a Receber & Payments
  payments: PaymentRecord[];
  recordPayment: (data: {
    saleId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => void;

  // Financial
  financialTransactions: FinancialTransaction[];
  addManualExpense: (data: {
    category: FinancialCategory;
    categoryLabel: string;
    description: string;
    amount: number;
    date: string;
  }) => void;
  deleteFinancialTransaction: (id: string) => void;
  deletePaymentReceipt: (id: string) => void;

  // Receipt Modal Target
  viewingReceiptSale: Sale | null;
  setViewingReceiptSale: (sale: Sale | null) => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;

  // Reset
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User>(initialUser);
  const [isLoggedIn, setIsLoggedInState] = useState<boolean>(false);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [currentModule, setCurrentModule] = useState<NavigationModule>('dashboard');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  const [clients, setClientsState] = useState<Client[]>([]);
  const [batches, setBatchesState] = useState<VaccineBatch[]>([]);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [commissioners, setCommissionersState] = useState<Commissioner[]>([]);
  const [commissions, setCommissionsState] = useState<CommissionEntry[]>([]);
  const [financialTransactions, setFinancialTransactionsState] = useState<FinancialTransaction[]>([]);
  const [payments, setPaymentsState] = useState<PaymentRecord[]>([]);
  const [stockAdjustments, setStockAdjustmentsState] = useState<StockAdjustment[]>([]);

  const [viewingReceiptSale, setViewingReceiptSale] = useState<Sale | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ID do usuário cujos dados já foram carregados do Supabase.
  // Enquanto for null, nada é salvo (evita sobrescrever a nuvem com o estado vazio inicial).
  const loadedUserIdRef = useRef<string | null>(null);

  const applyUserData = (data: UserData, authUser: { id: string; email?: string }) => {
    const profile = data.profile ?? { ...initialUser, id: authUser.id, email: authUser.email ?? '' };
    // O e-mail de login é gerenciado só no Supabase Auth; o perfil apenas o espelha.
    if (authUser.email) profile.email = authUser.email;
    if (profile.name === 'Junior' || profile.name === 'Hazan') {
      profile.name = 'Hassan';
      profile.avatarUrl = '/hazan-avatar.jpg';
    }
    setUserState(profile);
    setClientsState(data.clients);
    setBatchesState(data.batches);
    setSalesState(data.sales);
    setCommissionersState(data.commissioners);
    setCommissionsState(data.commissions);
    // Estorno de vendas canceladas antes desta regra existir (idempotente)
    const reversal = applySaleReversals(data.sales, data.finances, data.payments);
    setFinancialTransactionsState(reversal?.transactions ?? data.finances);
    setPaymentsState(reversal?.payments ?? data.payments);
    setStockAdjustmentsState(data.stockAdjustments);
  };

  // Supabase Auth: restaura a sessão e carrega os dados da conta
  useEffect(() => {
    const handleSession = async (authUser: { id: string; email?: string } | null) => {
      if (!authUser) {
        loadedUserIdRef.current = null;
        applyUserData(emptyUserData(), { id: '', email: '' });
        setIsLoggedInState(false);
        setIsLoadingSession(false);
        return;
      }
      if (loadedUserIdRef.current === authUser.id) return;

      setIsLoadingSession(true);
      try {
        const data = await cloudStorage.load(authUser.id);
        applyUserData(data, authUser);
        loadedUserIdRef.current = authUser.id;
        setIsLoggedInState(true);
      } catch (err) {
        console.error(err);
        addToast('error', 'Erro ao carregar dados', 'Não foi possível carregar seus dados do servidor.');
        await supabase.auth.signOut();
      } finally {
        setIsLoadingSession(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => handleSession(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Adiado para não chamar o Supabase dentro do callback de auth
      setTimeout(() => handleSession(session?.user ?? null), 0);
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync with Supabase (debounce para agrupar alterações em sequência)
  useEffect(() => {
    const userId = loadedUserIdRef.current;
    if (!userId) return;

    const timer = setTimeout(() => {
      cloudStorage
        .save(userId, {
          profile: user,
          clients,
          batches,
          sales,
          commissioners,
          commissions,
          finances: financialTransactions,
          payments,
          stockAdjustments,
        })
        .catch(err => {
          console.error(err);
          addToast('error', 'Erro ao salvar', 'As últimas alterações não foram salvas no servidor.');
        });
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, clients, batches, sales, commissioners, commissions, financialTransactions, payments, stockAdjustments]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = 't-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        console.error('[login] Supabase respondeu com erro:', error);
        return error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : error.message;
      }
      addToast('success', 'Bem-vindo de volta!', 'Sessão iniciada com sucesso.');
      return null;
    } catch (err) {
      console.error('[login] Falha ao contatar o Supabase:', err);
      return 'Não foi possível conectar ao servidor. Verifique sua internet e as chaves em .env (é necessário reiniciar "npm run dev" após editar o .env).';
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[logout] Falha ao encerrar sessão no servidor:', err);
    }
    setCurrentModule('dashboard');
    addToast('info', 'Sessão finalizada', 'Você saiu do sistema PYFAR.');
  };

  const updateUser = (data: Partial<User>) => {
    setUserState(prev => ({ ...prev, ...data }));
    addToast('success', 'Perfil atualizado', 'Configurações de usuário salvas com sucesso.');
  };

  // CLIENTS
  const addClient = (clientData: Omit<Client, 'id' | 'createdAt'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: 'cli-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setClientsState(prev => [newClient, ...prev]);
    addToast('success', 'Cliente cadastrado', `${newClient.name} foi adicionado à base de clientes.`);
    return newClient;
  };

  const updateClient = (id: string, data: Partial<Client>) => {
    setClientsState(prev => prev.map(c => (c.id === id ? { ...c, ...data } : c)));
    addToast('success', 'Cliente atualizado', 'Dados do cliente alterados com sucesso.');
  };

  const deleteClient = (id: string) => {
    setClientsState(prev => prev.filter(c => c.id !== id));
    addToast('info', 'Cliente removido', 'O registro foi removido com sucesso.');
  };

  // BATCHES / ENTRADA DE ESTOQUE
  const addBatch = (batchData: Omit<VaccineBatch, 'id' | 'createdAt' | 'currentQuantity' | 'status'>): VaccineBatch => {
    const newBatchId = 'bat-' + Date.now();
    const isExpired = new Date(batchData.expirationDate) < new Date();
    
    const newBatch: VaccineBatch = {
      ...batchData,
      id: newBatchId,
      currentQuantity: batchData.initialQuantity,
      status: isExpired ? 'vencido' : 'ativo',
      createdAt: new Date().toISOString(),
    };

    setBatchesState(prev => [newBatch, ...prev]);

    // REGRA DE NEGÓCIO: Compra do estoque entra AUTOMATICAMENTE no financeiro como saída
    const totalPurchaseCost = batchData.initialQuantity * batchData.unitCost;
    const newFinOutflow: FinancialTransaction = {
      id: 'fin-' + Date.now(),
      type: 'saida',
      category: 'compra_estoque',
      categoryLabel: 'Compra de Estoque',
      description: `Entrada Lote ${batchData.lotNumber} (${batchData.initialQuantity} un. ${batchData.vaccineName} a R$ ${batchData.unitCost.toFixed(2)})`,
      amount: totalPurchaseCost,
      date: batchData.entryDate || toLocalISODate(),
      referenceId: newBatchId,
      isAutomatic: true,
      createdAt: new Date().toISOString(),
    };
    setFinancialTransactionsState(prev => [newFinOutflow, ...prev]);

    addToast(
      'success',
      'Entrada de Estoque Registrada',
      `Lote ${newBatch.lotNumber} (${newBatch.initialQuantity} un de ${newBatch.vaccineName}) adicionado. Saída de R$ ${totalPurchaseCost.toFixed(2)} registrada no Financeiro.`
    );

    return newBatch;
  };

  const updateBatch = (id: string, data: Partial<VaccineBatch>) => {
    setBatchesState(prev => prev.map(b => (b.id === id ? { ...b, ...data } : b)));
    addToast('success', 'Lote atualizado', 'Informações do lote salvas.');
  };

  const deleteBatch = (id: string) => {
    setBatchesState(prev => prev.filter(b => b.id !== id));
    addToast('info', 'Lote excluído', 'Lote removido do estoque.');
  };

  // AJUSTE MANUAL DE ESTOQUE (com histórico e auditoria)
  const adjustStock = (data: {
    batchId: string;
    type: StockAdjustmentType;
    quantity: number;
    reason: StockAdjustmentReason;
    reasonLabel: string;
    notes?: string;
  }): boolean => {
    const batch = batches.find(b => b.id === data.batchId);
    if (!batch) {
      addToast('error', 'Ajuste Não Realizado', 'Lote não encontrado.');
      return false;
    }

    const rawQuantity = data.quantity;
    if (rawQuantity === null || rawQuantity === undefined || rawQuantity === ('' as unknown)) {
      addToast('error', 'Quantidade Inválida', 'Informe uma quantidade.');
      return false;
    }
    const quantity = Number(rawQuantity);
    if (!Number.isFinite(quantity)) {
      addToast('error', 'Quantidade Inválida', 'Informe um número válido.');
      return false;
    }
    if (!Number.isInteger(quantity)) {
      addToast('error', 'Quantidade Inválida', 'O estoque é controlado em unidades inteiras (sem casas decimais).');
      return false;
    }
    if (data.type === 'definir') {
      if (quantity < 0) {
        addToast('error', 'Quantidade Inválida', 'A quantidade não pode ser negativa.');
        return false;
      }
    } else if (quantity <= 0) {
      addToast('error', 'Quantidade Inválida', 'Informe uma quantidade maior que zero.');
      return false;
    }
    if (!data.reasonLabel || !data.reasonLabel.trim()) {
      addToast('error', 'Motivo Obrigatório', 'Selecione (ou descreva) o motivo do ajuste.');
      return false;
    }
    if (!user?.id) {
      addToast('error', 'Sessão Inválida', 'Não foi possível identificar o usuário responsável pelo ajuste.');
      return false;
    }

    const previousQuantity = batch.currentQuantity;
    let newQuantity: number;

    if (data.type === 'adicionar') {
      newQuantity = previousQuantity + quantity;
    } else if (data.type === 'remover') {
      if (quantity > previousQuantity) {
        addToast('error', 'Ajuste Não Realizado', `Não é possível remover ${quantity} un. O estoque atual é de apenas ${previousQuantity} un.`);
        return false;
      }
      newQuantity = previousQuantity - quantity;
    } else {
      newQuantity = quantity;
    }

    if (newQuantity < 0) {
      addToast('error', 'Ajuste Não Realizado', 'O estoque não pode ficar negativo.');
      return false;
    }

    const signedDelta = newQuantity - previousQuantity;
    if (signedDelta === 0) {
      addToast('warning', 'Nenhuma Alteração', 'A nova quantidade informada é igual ao estoque atual. Nenhum ajuste foi necessário.');
      return false;
    }

    const isExpired = new Date(batch.expirationDate) < new Date();
    const newStatus: VaccineBatch['status'] = newQuantity === 0 ? 'esgotado' : (isExpired ? 'vencido' : 'ativo');

    // 1. Aplica a nova quantidade no lote
    setBatchesState(prev => prev.map(b => (b.id === batch.id ? { ...b, currentQuantity: newQuantity, status: newStatus } : b)));

    // 2. Registra o ajuste no histórico de auditoria
    const adjustment: StockAdjustment = {
      id: 'adj-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      batchId: batch.id,
      vaccineName: batch.vaccineName,
      lotNumber: batch.lotNumber,
      previousQuantity,
      adjustmentQuantity: signedDelta,
      newQuantity,
      type: data.type,
      reason: data.reason,
      reasonLabel: data.reasonLabel,
      notes: data.notes?.trim() || undefined,
      userId: user.id,
      userName: user.name,
      createdAt: new Date().toISOString(),
    };
    setStockAdjustmentsState(prev => [adjustment, ...prev]);

    const signalPrefix = signedDelta > 0 ? '+' : '';
    addToast(
      'success',
      'Estoque Ajustado',
      `${batch.vaccineName} (Lote ${batch.lotNumber}): ${previousQuantity} → ${newQuantity} un. (${signalPrefix}${signedDelta})`
    );

    return true;
  };

  // SALES / VENDAS
  const addSale = (saleData: {
    clientId: string;
    items: Array<{
      batchId: string;
      quantity: number;
      unitPrice: number;
    }>;
    paymentMethod: PaymentMethod;
    downPayment: number;
    installmentsCount: number;
    dueDate: string;
    notes?: string;
  }): Sale | null => {
    const client = clients.find(c => c.id === saleData.clientId);
    if (!client) {
      addToast('error', 'Erro na Venda', 'Cliente não encontrado.');
      return null;
    }

    if (!saleData.items || saleData.items.length === 0) {
      addToast('error', 'Erro na Venda', 'Adicione pelo menos um item à venda.');
      return null;
    }

    // Process items and validate batches
    let totalQuantity = 0;
    let totalCost = 0;
    let totalAmount = 0;
    let totalGrossProfit = 0;

    const saleItems = saleData.items.map(item => {
      const batch = batches.find(b => b.id === item.batchId);
      if (!batch) {
        throw new Error(`Lote não encontrado`);
      }
      const itemCost = batch.unitCost * item.quantity;
      const itemPrice = item.unitPrice * item.quantity;
      const itemProfit = itemPrice - itemCost;
      const isExp = new Date(batch.expirationDate) < new Date();

      totalQuantity += item.quantity;
      totalCost += itemCost;
      totalAmount += itemPrice;
      totalGrossProfit += itemProfit;

      return {
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        vaccineName: batch.vaccineName,
        batchId: batch.id,
        lotNumber: batch.lotNumber,
        quantity: item.quantity,
        unitCost: batch.unitCost,
        unitPrice: item.unitPrice,
        totalCost: itemCost,
        totalPrice: itemPrice,
        grossProfit: itemProfit,
        expirationDate: batch.expirationDate,
        isExpired: isExp,
      };
    });

    const downPayment = Number(saleData.downPayment) || 0;
    const remainingBalance = Math.max(0, totalAmount - downPayment);
    
    let paymentStatus: Sale['status'] = 'pendente';
    if (remainingBalance <= 0) {
      paymentStatus = 'pago';
    } else if (downPayment > 0) {
      paymentStatus = 'parcialmente_pago';
    }

    // Check overdue
    if (paymentStatus !== 'pago' && getDaysOverdue(saleData.dueDate) > 0) {
      paymentStatus = 'atrasado';
    }

    // Check commissioner link
    let commissioner: Commissioner | undefined;
    let commissionTotal = 0;
    let ratePerUnit = 0;
    if (client.commissionerId) {
      commissioner = commissioners.find(c => c.id === client.commissionerId && c.status === 'ativo');
      if (commissioner) {
        ratePerUnit = commissioner.defaultRatePerUnit || 1.0;
        commissionTotal = totalQuantity * ratePerUnit;
      }
    }

    const saleId = 'sal-' + Date.now();
    const saleNumber = `VEN-${new Date().getFullYear()}-${String(sales.length + 1).padStart(3, '0')}`;

    const newSale: Sale = {
      id: saleId,
      saleNumber,
      clientId: client.id,
      clientName: client.name,
      storeName: client.storeName,
      items: saleItems,
      totalQuantity,
      totalCost,
      totalAmount,
      grossProfit: totalGrossProfit,
      paymentMethod: saleData.paymentMethod,
      downPayment,
      paidAmount: downPayment,
      remainingBalance,
      installmentsCount: saleData.installmentsCount || 1,
      dueDate: saleData.dueDate,
      notes: saleData.notes,
      status: paymentStatus,
      createdAt: new Date().toISOString(),
      commissionerId: commissioner?.id,
      commissionerName: commissioner?.name,
      commissionRatePerUnit: ratePerUnit,
      commissionTotal: commissioner ? commissionTotal : undefined,
    };

    // 1. Decrement batch inventory
    setBatchesState(prevBatches => {
      return prevBatches.map(b => {
        const matchingItem = saleData.items.find(it => it.batchId === b.id);
        if (matchingItem) {
          const newQty = Math.max(0, b.currentQuantity - matchingItem.quantity);
          return {
            ...b,
            currentQuantity: newQty,
            status: newQty === 0 ? 'esgotado' : b.status,
          };
        }
        return b;
      });
    });

    // 2. Add to sales
    setSalesState(prev => [newSale, ...prev]);

    // 3. Register financial inflow for downpayment or total payment
    if (downPayment > 0) {
      const isFull = downPayment >= totalAmount;
      const newFinInflow: FinancialTransaction = {
        id: 'fin-' + Date.now(),
        type: 'entrada',
        category: isFull ? 'venda_a_vista' : 'entrada_venda',
        categoryLabel: isFull ? 'Venda à Vista' : `Entrada de Venda (${((downPayment / totalAmount) * 100).toFixed(0)}%)`,
        description: `Recebimento da venda ${saleNumber} - ${client.name} (${client.storeName || 'Lojista'})`,
        amount: downPayment,
        date: toLocalISODate(),
        referenceId: saleId,
        isAutomatic: true,
        createdAt: new Date().toISOString(),
      };
      setFinancialTransactionsState(prev => [newFinInflow, ...prev]);

      // Add payment record
      const newPayment: PaymentRecord = {
        id: 'pay-' + Date.now(),
        saleId,
        clientId: client.id,
        clientName: client.name,
        amount: downPayment,
        paymentDate: toLocalISODate(),
        paymentMethod: saleData.paymentMethod,
        notes: isFull ? 'Pagamento integral à vista' : 'Valor de entrada no fechamento da venda',
      };
      setPaymentsState(prev => [newPayment, ...prev]);
    }

    // 4. Register Commission if linked
    if (commissioner && commissionTotal > 0) {
      // Proportional release: (paidAmount / totalAmount) * totalCommission
      const paidRatio = totalAmount > 0 ? (downPayment / totalAmount) : 0;
      const released = commissionTotal * paidRatio;

      let commStatus: CommissionEntry['status'] = 'pendente';
      if (released >= commissionTotal) {
        commStatus = 'liberada';
      } else if (released > 0) {
        commStatus = 'parcialmente_liberada';
      }

      const newCommissionEntry: CommissionEntry = {
        id: 'comm-' + Date.now(),
        saleId,
        saleNumber,
        commissionerId: commissioner.id,
        commissionerName: commissioner.name,
        clientId: client.id,
        clientName: client.name,
        totalUnits: totalQuantity,
        ratePerUnit,
        totalCommission: commissionTotal,
        releasedCommission: released,
        paidCommission: 0,
        status: commStatus,
        saleTotal: totalAmount,
        salePaidAmount: downPayment,
        lastUpdated: new Date().toISOString(),
      };

      setCommissionsState(prev => [newCommissionEntry, ...prev]);
    }

    // Trigger celebration effects for big sales
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    addToast(
      'success',
      'Venda Gerada com Sucesso!',
      `Venda ${saleNumber} de ${totalQuantity} vacinas para ${client.name} (Total: R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`
    );

    return newSale;
  };

  const cancelSale = (id: string) => {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;

    // Restore batch inventory
    setBatchesState(prevBatches => {
      return prevBatches.map(b => {
        const item = sale.items.find(it => it.batchId === b.id);
        if (item) {
          const restoredQty = b.currentQuantity + item.quantity;
          return {
            ...b,
            currentQuantity: restoredQty,
            status: restoredQty > 0 && b.status === 'esgotado' ? 'ativo' : b.status,
          };
        }
        return b;
      });
    });

    // Update sale status
    setSalesState(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelado' } : s));

    // Cancel related commission
    setCommissionsState(prev => prev.map(c => c.saleId === id ? { ...c, status: 'cancelada' } : c));

    // Estorno: entradas e pagamentos da venda ficam no histórico, marcados como estornados
    const cancelledSale: Sale = { ...sale, status: 'cancelado' };
    const nowIso = new Date().toISOString();
    setFinancialTransactionsState(prev => applySaleReversals([cancelledSale], prev, [], nowIso)?.transactions ?? prev);
    setPaymentsState(prev => applySaleReversals([cancelledSale], [], prev, nowIso)?.payments ?? prev);

    addToast(
      'warning',
      'Venda Cancelada',
      sale.paidAmount > 0
        ? `A venda ${sale.saleNumber} foi cancelada, os estoques retornados e ${formatCurrency(sale.paidAmount)} recebidos foram estornados.`
        : `A venda ${sale.saleNumber} foi cancelada e os estoques retornados.`
    );
  };

  // COMMISSIONERS
  const addCommissioner = (commData: Omit<Commissioner, 'id' | 'createdAt'>): Commissioner => {
    const newComm: Commissioner = {
      ...commData,
      id: 'com-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setCommissionersState(prev => [newComm, ...prev]);
    addToast('success', 'Comissionador Cadastrado', `${newComm.name} registrado com sucesso.`);
    return newComm;
  };

  const updateCommissioner = (id: string, data: Partial<Commissioner>) => {
    setCommissionersState(prev => prev.map(c => (c.id === id ? { ...c, ...data } : c)));
    addToast('success', 'Comissionador Atualizado', 'Alterações salvas.');
  };

  const deleteCommissioner = (id: string) => {
    setCommissionersState(prev => prev.filter(c => c.id !== id));
    addToast('info', 'Comissionador Excluído', 'Registro removido.');
  };

  // PAY COMMISSION (REGRA: ao marcar como paga, o valor entra no financeiro como saída)
  const payCommission = (id: string) => {
    const comm = commissions.find(c => c.id === id);
    if (!comm) return;

    const amountToPay = comm.releasedCommission - comm.paidCommission;
    if (amountToPay <= 0) {
      addToast('warning', 'Atenção', 'Não há saldo liberado pendente para este pagamento.');
      return;
    }

    setCommissionsState(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          paidCommission: c.releasedCommission,
          status: 'paga',
          lastUpdated: new Date().toISOString(),
        };
      }
      return c;
    }));

    // Saída no financeiro
    const newFinOutflow: FinancialTransaction = {
      id: 'fin-' + Date.now(),
      type: 'saida',
      category: 'comissao_paga',
      categoryLabel: 'Comissão Paga',
      description: `Pagamento de comissão a ${comm.commissionerName} ref. venda ${comm.saleNumber} (${comm.clientName})`,
      amount: amountToPay,
      date: toLocalISODate(),
      referenceId: comm.id,
      isAutomatic: true,
      createdAt: new Date().toISOString(),
    };
    setFinancialTransactionsState(prev => [newFinOutflow, ...prev]);

    addToast(
      'success',
      'Comissão Paga',
      `R$ ${amountToPay.toFixed(2)} pago para ${comm.commissionerName}. Despesa registrada no financeiro.`
    );
  };

  // RECORD PAYMENT (Contas a Receber)
  const recordPayment = (data: {
    saleId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => {
    const sale = sales.find(s => s.id === data.saleId);
    if (!sale) {
      addToast('error', 'Erro', 'Venda não encontrada.');
      return;
    }

    const payAmount = Math.min(data.amount, sale.remainingBalance);
    if (payAmount <= 0) {
      addToast('warning', 'Aviso', 'Esta venda já está quitada.');
      return;
    }

    const newPaidTotal = sale.paidAmount + payAmount;
    const newRemaining = Math.max(0, sale.totalAmount - newPaidTotal);
    
    let newStatus: Sale['status'] = 'pendente';
    if (newRemaining <= 0) {
      newStatus = 'pago';
    } else if (getDaysOverdue(sale.dueDate) > 0) {
      newStatus = 'atrasado';
    } else {
      newStatus = 'parcialmente_pago';
    }

    // 1. Update Sale
    setSalesState(prev => prev.map(s => {
      if (s.id === data.saleId) {
        return {
          ...s,
          paidAmount: newPaidTotal,
          remainingBalance: newRemaining,
          status: newStatus,
        };
      }
      return s;
    }));

    // 2. Add Payment Record
    const paymentRecord: PaymentRecord = {
      id: 'pay-' + Date.now(),
      saleId: sale.id,
      clientId: sale.clientId,
      clientName: sale.clientName,
      amount: payAmount,
      paymentDate: data.paymentDate || toLocalISODate(),
      paymentMethod: data.paymentMethod,
      notes: data.notes || `Pagamento de parcela da venda ${sale.saleNumber}`,
    };
    setPaymentsState(prev => [paymentRecord, ...prev]);

    // 3. Add Financial Inflow
    const finInflow: FinancialTransaction = {
      id: 'fin-' + Date.now(),
      type: 'entrada',
      category: 'recebimento_parcela',
      categoryLabel: newStatus === 'pago' ? 'Quitação de Venda' : 'Recebimento de Parcela',
      description: `Pagamento recebido de ${sale.clientName} ref. venda ${sale.saleNumber}`,
      amount: payAmount,
      date: data.paymentDate || toLocalISODate(),
      referenceId: sale.id,
      isAutomatic: true,
      createdAt: new Date().toISOString(),
    };
    setFinancialTransactionsState(prev => [finInflow, ...prev]);

    // 4. Update Proportional Commission if exists
    setCommissionsState(prev => prev.map(c => {
      if (c.saleId === data.saleId) {
        const ratio = sale.totalAmount > 0 ? (newPaidTotal / sale.totalAmount) : 0;
        const newReleased = Number((c.totalCommission * ratio).toFixed(2));
        let commStatus: CommissionEntry['status'] = c.status;
        
        if (c.paidCommission >= newReleased && newReleased >= c.totalCommission) {
          commStatus = 'paga';
        } else if (newReleased >= c.totalCommission) {
          commStatus = 'liberada';
        } else if (newReleased > 0) {
          commStatus = 'parcialmente_liberada';
        }

        return {
          ...c,
          salePaidAmount: newPaidTotal,
          releasedCommission: newReleased,
          status: commStatus,
          lastUpdated: new Date().toISOString(),
        };
      }
      return c;
    }));

    if (newRemaining <= 0) {
      try {
        confetti({ particleCount: 60, spread: 60 });
      } catch {
        // ignore
      }
      addToast('success', 'Dívida Quitada!', `Venda ${sale.saleNumber} de ${sale.clientName} foi totalmente paga!`);
    } else {
      addToast('success', 'Pagamento Registrado', `Recebido R$ ${payAmount.toFixed(2)}. Saldo restante: R$ ${newRemaining.toFixed(2)}.`);
    }
  };

  // FINANCIAL MANUAL EXPENSES
  const addManualExpense = (data: {
    category: FinancialCategory;
    categoryLabel: string;
    description: string;
    amount: number;
    date: string;
  }) => {
    const newTransaction: FinancialTransaction = {
      id: 'fin-' + Date.now(),
      type: 'saida',
      category: data.category,
      categoryLabel: data.categoryLabel,
      description: data.description,
      amount: Number(data.amount),
      date: data.date || toLocalISODate(),
      isAutomatic: false,
      createdAt: new Date().toISOString(),
    };
    setFinancialTransactionsState(prev => [newTransaction, ...prev]);
    addToast('success', 'Despesa Registrada', `Saída de R$ ${Number(data.amount).toFixed(2)} (${data.categoryLabel}) registrada no financeiro.`);
  };

  const deleteFinancialTransaction = (id: string) => {
    setFinancialTransactionsState(prev => prev.filter(f => f.id !== id));
    addToast('info', 'Lançamento Removido', 'Registro financeiro excluído.');
  };

  // Exclui um recebimento de parcela lançado por engano: remove o lançamento e o registro de
  // pagamento e devolve o valor ao saldo da venda (e recalcula a comissão liberada).
  const deletePaymentReceipt = (id: string) => {
    const tx = financialTransactions.find(f => f.id === id);
    if (!tx || tx.type !== 'entrada' || tx.category !== 'recebimento_parcela' || !tx.referenceId) {
      addToast('error', 'Erro', 'Este lançamento não é um recebimento de parcela.');
      return;
    }
    const sale = sales.find(s => s.id === tx.referenceId);
    const payment = payments.find(p => p.saleId === tx.referenceId && p.amount === tx.amount && p.paymentDate === tx.date && !p.reversedAt);

    setFinancialTransactionsState(prev => prev.filter(f => f.id !== id));
    if (payment) setPaymentsState(prev => prev.filter(p => p.id !== payment.id));

    if (sale && !tx.reversedAt) {
      const newPaid = Math.max(0, sale.paidAmount - tx.amount);
      const newRemaining = Math.max(0, sale.totalAmount - newPaid);
      let newStatus: Sale['status'] = 'pendente';
      if (newRemaining <= 0) newStatus = 'pago';
      else if (getDaysOverdue(sale.dueDate) > 0) newStatus = 'atrasado';
      else if (newPaid > 0) newStatus = 'parcialmente_pago';

      setSalesState(prev => prev.map(s => s.id === sale.id
        ? { ...s, paidAmount: newPaid, remainingBalance: newRemaining, status: newStatus }
        : s));

      setCommissionsState(prev => prev.map(c => {
        if (c.saleId !== sale.id || c.status === 'cancelada') return c;
        const ratio = sale.totalAmount > 0 ? newPaid / sale.totalAmount : 0;
        const newReleased = Number((c.totalCommission * ratio).toFixed(2));
        let commStatus: CommissionEntry['status'] = 'pendente';
        if (newReleased >= c.totalCommission) commStatus = c.paidCommission >= c.totalCommission ? 'paga' : 'liberada';
        else if (newReleased > 0) commStatus = 'parcialmente_liberada';
        return { ...c, salePaidAmount: newPaid, releasedCommission: newReleased, status: commStatus, lastUpdated: new Date().toISOString() };
      }));
    }

    addToast('info', 'Recebimento Excluído', `Pagamento de R$ ${tx.amount.toFixed(2)} removido e saldo da venda restaurado.`);
  };

  // Zera todos os dados operacionais da conta (o perfil é mantido)
  const resetAllData = () => {
    setClientsState([]);
    setBatchesState([]);
    setSalesState([]);
    setCommissionersState([]);
    setCommissionsState([]);
    setFinancialTransactionsState([]);
    setPaymentsState([]);
    setStockAdjustmentsState([]);
    addToast('info', 'Dados Zerados', 'Todos os registros da conta foram apagados.');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isLoggedIn,
        isLoadingSession,
        login,
        logout,
        updateUser,
        currentModule,
        setCurrentModule,
        globalSearch,
        setGlobalSearch,
        clients,
        addClient,
        updateClient,
        deleteClient,
        batches,
        addBatch,
        updateBatch,
        deleteBatch,
        stockAdjustments,
        adjustStock,
        sales,
        addSale,
        cancelSale,
        commissioners,
        addCommissioner,
        updateCommissioner,
        deleteCommissioner,
        commissions,
        payCommission,
        payments,
        recordPayment,
        financialTransactions,
        addManualExpense,
        deleteFinancialTransaction,
        deletePaymentReceipt,
        viewingReceiptSale,
        setViewingReceiptSale,
        toasts,
        addToast,
        removeToast,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
