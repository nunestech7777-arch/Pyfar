import { AccessRole, PaymentMethod, SellerClient, SellerData, SellerSale } from '../types';
import { supabase } from './supabase';

// Acesso do vendedor (ver supabase/migrations/003_seller_access.sql).
// O vendedor não lê public.user_data: tudo passa pelas funções seller_* no servidor, que filtram
// pelo vendedor do token e nunca devolvem custo, lucro, lote ou dados financeiros da empresa.

export interface SellerClientInput {
  name: string;
  storeName?: string;
  phone?: string;
  cnpj?: string;
  city?: string;
  address?: string;
  notes?: string;
}

export interface SellerSaleInput {
  clientId: string;
  items: Array<{ product: string; quantity: number; unitPrice: number }>;
  paymentMethod: PaymentMethod;
  downPayment: number;
  installmentsCount: number;
  dueDate: string;
  notes?: string;
}

// Postgres "undefined_table": a migration 003 ainda não foi aplicada — não existe vendedor algum.
const isMissingTableError = (error: { code?: string } | null): boolean =>
  !!error && (error.code === 'PGRST205' || error.code === '42P01');

const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message || 'Erro ao comunicar com o servidor.');
  return data as T;
};

export const sellerApi = {
  // Perfil de acesso do usuário logado. Falhas de rede/servidor propagam (o login é abortado);
  // nunca se assume "admin" por erro — exceto se a tabela de vendedores nem existe.
  // O filtro por user_id é obrigatório: a policy também deixa o admin ler as linhas dos vendedores dele.
  getAccessRole: async (userId: string): Promise<AccessRole> => {
    const { data, error } = await supabase
      .from('seller_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      if (isMissingTableError(error)) return 'admin';
      throw error;
    }
    return data ? 'vendedor' : 'admin';
  },

  getData: () => rpc<SellerData>('seller_get_data'),

  createClient: (input: SellerClientInput) => rpc<SellerClient>('seller_create_client', { p: input }),

  updateClient: (id: string, input: SellerClientInput) =>
    rpc<SellerClient>('seller_update_client', { p_id: id, p: input }),

  createSale: (input: SellerSaleInput) => rpc<SellerSale>('seller_create_sale', { p: input }),
};
