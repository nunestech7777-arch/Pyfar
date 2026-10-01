export type NavigationModule = 
  | 'dashboard'
  | 'estoque'
  | 'entrada_estoque'
  | 'vendas'
  | 'nova_venda'
  | 'clientes'
  | 'comissionadores'
  | 'mapa_comissoes'
  | 'contas_receber'
  | 'financeiro'
  | 'relatorios'
  | 'comprovantes'
  | 'configuracoes';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operador' | 'vendedor';
  avatarUrl?: string;
  companyName: string;
}

export interface Client {
  id: string;
  name: string; // Obrigatório
  storeName?: string; // Opcional
  phone?: string; // Opcional
  cnpj?: string; // Opcional
  city?: string; // Opcional
  address?: string; // Opcional
  notes?: string; // Opcional
  commissionerId?: string; // Opcional (Comissionador vinculado)
  status: 'ativo' | 'inativo';
  createdAt: string;
  // Vendedor que cadastrou (preenchido no servidor por seller_create_client)
  sellerId?: string;
  sellerName?: string;
}

export interface VaccineBatch {
  id: string;
  vaccineName: string;
  manufacturer: string;
  lotNumber: string;
  initialQuantity: number;
  currentQuantity: number;
  unitCost: number; // Preço de custo unitário
  supplier?: string; // Fornecedor opcional
  entryDate: string; // Data de entrada
  expirationDate: string; // Validade
  notes?: string;
  status: 'ativo' | 'esgotado' | 'vencido';
  createdAt: string;
}

export interface SaleItem {
  id: string;
  vaccineName: string;
  batchId: string;
  lotNumber: string;
  quantity: number;
  unitCost: number; // Custo unitário do lote
  unitPrice: number; // Preço de venda unitário
  totalCost: number; // unitCost * quantity
  totalPrice: number; // unitPrice * quantity
  grossProfit: number; // (unitPrice - unitCost) * quantity
  expirationDate?: string;
  isExpired?: boolean;
}

export type PaymentMethod = 'pix' | 'dinheiro' | 'transferencia' | 'boleto' | 'cheque' | 'cartao';
export type PaymentStatus = 'pago' | 'parcialmente_pago' | 'pendente' | 'atrasado' | 'cancelado';

export interface PaymentRecord {
  id: string;
  saleId: string;
  clientId: string;
  clientName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  // Estorno: preenchido quando a venda foi cancelada. O registro é mantido para auditoria,
  // mas deixa de contar como recebimento.
  reversedAt?: string;
  reversalReason?: string;
  // Recebimento informado por vendedor no fechamento da venda (seller_create_sale)
  sellerId?: string;
  sellerName?: string;
}

export interface Sale {
  id: string;
  saleNumber: string; // ex: VEN-2026-001
  clientId: string;
  clientName: string;
  storeName?: string;
  items: SaleItem[];
  totalQuantity: number;
  totalCost: number;
  totalAmount: number;
  grossProfit: number; // totalAmount - totalCost
  paymentMethod: PaymentMethod;
  downPayment: number; // Valor de entrada
  paidAmount: number; // Total já pago (downPayment + pagamentos posteriores)
  remainingBalance: number; // totalAmount - paidAmount
  installmentsCount: number; // Número de parcelas
  dueDate: string; // Data de vencimento
  notes?: string;
  status: PaymentStatus;
  createdAt: string;
  
  // Dados de comissão se houver
  commissionerId?: string;
  commissionerName?: string;
  commissionRatePerUnit?: number;
  commissionTotal?: number;

  // Vendedor que lançou a venda (preenchido no servidor por seller_create_sale)
  sellerId?: string;
  sellerName?: string;
}

export interface Commissioner {
  id: string;
  name: string; // Obrigatório
  phone?: string; // Opcional
  defaultRatePerUnit: number; // ex: R$ 1,00 por unidade
  notes?: string;
  status: 'ativo' | 'inativo';
  createdAt: string;
}

export type CommissionStatus = 'pendente' | 'parcialmente_liberada' | 'liberada' | 'paga' | 'cancelada';

export interface CommissionEntry {
  id: string;
  saleId: string;
  saleNumber: string;
  commissionerId: string;
  commissionerName: string;
  clientId: string;
  clientName: string;
  totalUnits: number;
  ratePerUnit: number;
  totalCommission: number;
  releasedCommission: number; // Proporcional ao que o cliente já pagou
  paidCommission: number; // O que o dono já pagou ao comissionador
  status: CommissionStatus;
  saleTotal: number;
  salePaidAmount: number;
  lastUpdated: string;
}

export type FinancialCategory = 
  // Entradas automáticas
  | 'venda_a_vista'
  | 'entrada_venda'
  | 'recebimento_parcela'
  | 'outra_entrada'
  // Saídas automáticas
  | 'compra_estoque'
  | 'comissao_paga'
  // Saídas manuais
  | 'frete'
  | 'transporte'
  | 'combustivel'
  | 'aluguel'
  | 'pro_labore'
  | 'contas_empresa'
  | 'taxas'
  | 'outras_despesas';

export interface FinancialTransaction {
  id: string;
  type: 'entrada' | 'saida';
  category: FinancialCategory;
  categoryLabel: string;
  description: string;
  amount: number;
  date: string;
  referenceId?: string; // saleId, batchId, commissionId
  isAutomatic: boolean;
  createdAt: string;
  // Estorno de entrada de venda cancelada: mantida no histórico, fora dos totais.
  reversedAt?: string;
  reversalReason?: string;
  // Entrada informada por vendedor no fechamento da venda (seller_create_sale)
  sellerId?: string;
  sellerName?: string;
}

export type StockAdjustmentType = 'adicionar' | 'remover' | 'definir';

export type StockAdjustmentReason =
  | 'entrada_nao_registrada'
  | 'erro_contagem'
  | 'correcao_lancamento'
  | 'perda_avaria'
  | 'produto_encontrado'
  | 'inventario_fisico'
  | 'divergencia_estoque'
  | 'outro';

export interface StockAdjustment {
  id: string;
  batchId: string;
  vaccineName: string;
  lotNumber: string;
  previousQuantity: number;
  adjustmentQuantity: number; // Delta efetivamente aplicado (sinal + ou -)
  newQuantity: number;
  type: StockAdjustmentType;
  reason: StockAdjustmentReason;
  reasonLabel: string;
  notes?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// ============================================================================
// ACESSO VENDEDOR
// ============================================================================
// Perfil de acesso vindo do servidor (public.seller_profiles), não do perfil salvo no jsonb.
export type AccessRole = 'admin' | 'vendedor';

export type SellerModule = 'inicio' | 'nova_venda' | 'minhas_vendas' | 'meus_clientes' | 'produtos';

// Visões devolvidas por seller_get_data(): só os campos liberados ao vendedor
// (sem custo, lucro, margem, lote, fornecedor ou comissão).
export interface SellerClient {
  id: string;
  name: string;
  storeName?: string | null;
  phone?: string | null;
  cnpj?: string | null;
  city?: string | null;
  address?: string | null;
  notes?: string | null;
  status: 'ativo' | 'inativo';
  createdAt: string;
  sellerName?: string | null; // preenchido quando o cliente foi cadastrado por um vendedor
  isOwn?: boolean; // cadastrado pelo vendedor logado (só esses ele pode editar)
}

export interface SellerSaleItem {
  vaccineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SellerSale {
  id: string;
  saleNumber: string;
  clientId: string;
  clientName: string;
  storeName?: string | null;
  items: SellerSaleItem[];
  totalQuantity: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  downPayment: number;
  paidAmount: number;
  remainingBalance: number;
  installmentsCount: number;
  dueDate: string;
  notes?: string | null;
  status: PaymentStatus;
  createdAt: string;
}

export interface SellerPayment {
  id: string;
  saleId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
}

export interface SellerProduct {
  name: string;
  manufacturer?: string | null;
  available: number;
}

export interface SellerData {
  seller: { id: string; name: string };
  clients: SellerClient[];
  sales: SellerSale[];
  payments: SellerPayment[];
  products: SellerProduct[];
}
