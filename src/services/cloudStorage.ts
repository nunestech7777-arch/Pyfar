import {
  Client,
  VaccineBatch,
  Sale,
  Commissioner,
  CommissionEntry,
  FinancialTransaction,
  PaymentRecord,
  StockAdjustment,
  User
} from '../types';
import { supabase } from './supabase';

export interface UserData {
  profile: User | null;
  clients: Client[];
  batches: VaccineBatch[];
  sales: Sale[];
  commissioners: Commissioner[];
  commissions: CommissionEntry[];
  finances: FinancialTransaction[];
  payments: PaymentRecord[];
  stockAdjustments: StockAdjustment[];
}

export const emptyUserData = (): UserData => ({
  profile: null,
  clients: [],
  batches: [],
  sales: [],
  commissioners: [],
  commissions: [],
  finances: [],
  payments: [],
  stockAdjustments: [],
});

const BASE_COLUMNS = 'profile, clients, batches, sales, commissioners, commissions, finances, payments';

// Persistência por conta na tabela public.user_data (ver supabase/migrations/001_user_data.sql e 002_stock_adjustments.sql).
//
// A coluna stock_adjustments (migration 002) pode ainda não existir em bancos que não rodaram a
// migration mais recente. load()/save() tentam usá-la e, se o Postgres reclamar de coluna
// inexistente (42703), caem automaticamente para o schema antigo — para nunca derrubar o login
// nem impedir o salvamento do restante dos dados por causa de uma migration pendente.
const isMissingColumnError = (error: { code?: string; message?: string } | null): boolean =>
  !!error && (error.code === '42703' || /column .*stock_adjustments.* does not exist/i.test(error.message || ''));

export const cloudStorage = {
  load: async (userId: string): Promise<UserData> => {
    const { data, error } = await supabase
      .from('user_data')
      .select(`${BASE_COLUMNS}, stock_adjustments`)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (!isMissingColumnError(error)) throw error;
      // Migration 002 ainda não foi rodada neste banco: carrega sem a coluna nova.
      const fallback = await supabase
        .from('user_data')
        .select(BASE_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle();
      if (fallback.error) throw fallback.error;
      if (!fallback.data) return emptyUserData();
      return { ...emptyUserData(), ...fallback.data };
    }

    // Conta nova: começa sem nenhum dado
    if (!data) return emptyUserData();
    const { stock_adjustments, ...rest } = data as typeof data & { stock_adjustments?: StockAdjustment[] };
    return { ...emptyUserData(), ...rest, stockAdjustments: stock_adjustments ?? [] };
  },

  save: async (userId: string, userData: UserData): Promise<void> => {
    const { stockAdjustments, ...rest } = userData;
    const { error } = await supabase
      .from('user_data')
      .upsert({
        user_id: userId,
        ...rest,
        stock_adjustments: stockAdjustments,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      if (!isMissingColumnError(error)) throw error;
      // Migration 002 ainda não foi rodada: salva o restante dos dados sem a coluna nova
      // (o ajuste de estoque em si não persiste até a migration ser aplicada).
      const { error: fallbackError } = await supabase
        .from('user_data')
        .upsert({
          user_id: userId,
          ...rest,
          updated_at: new Date().toISOString(),
        });
      if (fallbackError) throw fallbackError;
      return;
    }
  },
};
