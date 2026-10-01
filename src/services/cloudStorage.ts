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

// Persistência por conta na tabela public.user_data (migrations 001, 002 e 003).
//
// Colunas de migrations recentes podem ainda não existir em bancos que não as rodaram.
// load()/save() tentam usá-las e, se o Postgres reclamar de coluna inexistente (42703), caem
// automaticamente para o schema antigo — para nunca derrubar o login nem impedir o salvamento.
const isMissingColumnError = (error: { code?: string; message?: string } | null): boolean =>
  !!error && (error.code === '42703' || /column .*(stock_adjustments|version).* does not exist/i.test(error.message || ''));

// `version` (migration 003) é incrementada pelo banco a cada gravação. Vendedores gravam vendas e
// clientes direto no servidor; com a versão, o app do admin percebe que a linha mudou e mescla em vez
// de sobrescrever. null = linha ainda não existe ou banco sem a migration 003.
export interface LoadedUserData {
  data: UserData;
  version: number | null;
  exists: boolean; // a linha existe (e é visível para este usuário)
}

export type SaveResult =
  | { status: 'saved'; version: number | null }
  | { status: 'conflict' };

const toRow = (userData: UserData) => {
  const { stockAdjustments, ...rest } = userData;
  return { ...rest, stock_adjustments: stockAdjustments, updated_at: new Date().toISOString() };
};

const legacySave = async (userId: string, userData: UserData): Promise<SaveResult> => {
  const row = toRow(userData);
  const withVersion = await supabase.from('user_data').upsert({ user_id: userId, ...row }).select('version').maybeSingle();
  if (!withVersion.error) {
    const version = (withVersion.data as { version?: number } | null)?.version;
    return { status: 'saved', version: typeof version === 'number' ? version : null };
  }
  if (!isMissingColumnError(withVersion.error)) throw withVersion.error;
  // Migration 003 ainda não foi rodada: grava sem ler a versão.
  const { error } = await supabase.from('user_data').upsert({ user_id: userId, ...row });
  if (!error) return { status: 'saved', version: null };
  if (!isMissingColumnError(error)) throw error;
  // Migration 002 ainda não foi rodada: salva o restante dos dados sem a coluna nova
  // (o ajuste de estoque em si não persiste até a migration ser aplicada).
  const { stock_adjustments: _ignored, ...withoutAdjustments } = row;
  const { error: fallbackError } = await supabase.from('user_data').upsert({ user_id: userId, ...withoutAdjustments });
  if (fallbackError) throw fallbackError;
  return { status: 'saved', version: null };
};

export const cloudStorage = {
  load: async (userId: string): Promise<LoadedUserData> => {
    const { data, error } = await supabase
      .from('user_data')
      .select(`${BASE_COLUMNS}, stock_adjustments, version`)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (!isMissingColumnError(error)) throw error;
      // Migration 002/003 ainda não foi rodada neste banco: carrega sem as colunas novas.
      const fallback = await supabase
        .from('user_data')
        .select(BASE_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle();
      if (fallback.error) throw fallback.error;
      if (!fallback.data) return { data: emptyUserData(), version: null, exists: false };
      return { data: { ...emptyUserData(), ...fallback.data }, version: null, exists: true };
    }

    // Conta nova: começa sem nenhum dado
    if (!data) return { data: emptyUserData(), version: null, exists: false };
    const { stock_adjustments, version, ...rest } = data as typeof data & { stock_adjustments?: StockAdjustment[]; version?: number };
    return {
      data: { ...emptyUserData(), ...rest, stockAdjustments: stock_adjustments ?? [] },
      version: typeof version === 'number' ? version : null,
      exists: true,
    };
  },

  // Só a versão atual (consulta leve, usada para perceber gravações feitas por vendedores).
  loadVersion: async (userId: string): Promise<number | null> => {
    const { data, error } = await supabase
      .from('user_data')
      .select('version')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      if (isMissingColumnError(error)) return null;
      throw error;
    }
    return data && typeof data.version === 'number' ? data.version : null;
  },

  // Com expectedVersion, grava só se a linha não mudou desde a última leitura; senão devolve
  // 'conflict' para o chamador recarregar e mesclar. Sem versão (linha nova ou banco sem a
  // migration 003), grava como antes.
  save: async (userId: string, userData: UserData, expectedVersion: number | null): Promise<SaveResult> => {
    if (expectedVersion === null) return legacySave(userId, userData);

    const { data, error } = await supabase
      .from('user_data')
      .update(toRow(userData))
      .eq('user_id', userId)
      .eq('version', expectedVersion)
      .select('version');

    if (error) {
      if (!isMissingColumnError(error)) throw error;
      return legacySave(userId, userData);
    }
    if (!data || data.length === 0) return { status: 'conflict' };
    return { status: 'saved', version: data[0].version as number };
  },
};
