// Mescla de três vias dos dados da conta (módulo puro, sem React).
//
// O app do admin regrava a linha inteira de public.user_data, enquanto vendedores gravam vendas e
// clientes direto no servidor. Quando a gravação do admin detecta que a linha mudou (conflito de
// versão), ou o polling percebe uma gravação nova, mesclamos:
//   base   = o que o admin leu/gravou por último no servidor
//   local  = o estado atual na tela do admin
//   remote = o que está no servidor agora
// Regra por item (id): quem mudou em relação à base vence; se os dois mudaram, campo a campo
// (mudança local vence). Para o saldo de lote, os dois deltas são somados (venda do vendedor +
// ajuste/venda do admin), para nenhuma baixa de estoque se perder.
import type { VaccineBatch } from '../types';
import type { UserData } from '../services/cloudStorage';
import { isDateExpired } from './formatters';

type WithId = { id: string };

// JSON com chaves ordenadas: o jsonb do Postgres reordena as chaves, então o mesmo objeto lido do
// servidor e o montado no app teriam JSON.stringify diferentes.
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.keys(v).sort().reduce<Record<string, unknown>>((acc, k) => { acc[k] = (v as Record<string, unknown>)[k]; return acc; }, {})
      : v);

const same = (a: unknown, b: unknown): boolean => canonical(a) === canonical(b);

const mergeFields = <T extends WithId>(base: T, local: T, remote: T): T => {
  const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const b = (base as Record<string, unknown>)[key];
    const l = (local as Record<string, unknown>)[key];
    const r = (remote as Record<string, unknown>)[key];
    const value = same(l, b) ? r : l;
    if (value !== undefined) result[key] = value;
  }
  return result as T;
};

// `oversold` recebe os lotes em que as baixas somadas passaram do saldo (venda simultânea do admin
// e de um vendedor com o mesmo estoque) — o saldo fica em 0 e o admin é avisado.
const mergeBatch = (oversold: VaccineBatch[]) => (base: VaccineBatch, local: VaccineBatch, remote: VaccineBatch): VaccineBatch => {
  const merged = mergeFields(base, local, remote);
  const rawQuantity = remote.currentQuantity + (local.currentQuantity - base.currentQuantity);
  if (rawQuantity < 0) oversold.push(merged);
  const quantity = Math.max(0, rawQuantity);
  const status: VaccineBatch['status'] = quantity === 0
    ? 'esgotado'
    : (isDateExpired(merged.expirationDate) ? 'vencido' : 'ativo');
  return { ...merged, currentQuantity: quantity, status };
};

export const mergeCollection = <T extends WithId>(
  base: T[],
  local: T[],
  remote: T[],
  mergeItem: (b: T, l: T, r: T) => T = mergeFields,
): T[] => {
  const baseMap = new Map(base.map(x => [x.id, x]));
  const localMap = new Map(local.map(x => [x.id, x]));
  const remoteMap = new Map(remote.map(x => [x.id, x]));
  const result: T[] = [];

  // Itens criados localmente desde a base (o app insere no início das listas)
  for (const l of local) {
    if (!baseMap.has(l.id) && !remoteMap.has(l.id)) result.push(l);
  }

  for (const r of remote) {
    const b = baseMap.get(r.id);
    const l = localMap.get(r.id);
    if (!b) {
      result.push(l ?? r); // criado no servidor (ex.: venda do vendedor)
    } else if (!l) {
      if (!same(r, b)) result.push(r); // excluído localmente; só volta se o servidor o alterou
    } else if (same(l, b)) {
      result.push(r);
    } else if (same(r, b)) {
      result.push(l);
    } else {
      result.push(mergeItem(b, l, r));
    }
  }

  // Excluídos no servidor mas alterados localmente: mantém a versão local
  for (const l of local) {
    const b = baseMap.get(l.id);
    if (b && !remoteMap.has(l.id) && !same(l, b)) result.push(l);
  }

  return result;
};

export interface MergeResult {
  data: UserData;
  oversold: VaccineBatch[];
}

export const mergeUserData = (base: UserData, local: UserData, remote: UserData): MergeResult => {
  const oversold: VaccineBatch[] = [];
  return { data: mergeData(base, local, remote, oversold), oversold };
};

const mergeData = (base: UserData, local: UserData, remote: UserData, oversold: VaccineBatch[]): UserData => ({
  profile: local.profile,
  clients: mergeCollection(base.clients, local.clients, remote.clients),
  batches: mergeCollection(base.batches, local.batches, remote.batches, mergeBatch(oversold)),
  sales: mergeCollection(base.sales, local.sales, remote.sales),
  commissioners: mergeCollection(base.commissioners, local.commissioners, remote.commissioners),
  commissions: mergeCollection(base.commissions, local.commissions, remote.commissions),
  finances: mergeCollection(base.finances, local.finances, remote.finances),
  payments: mergeCollection(base.payments, local.payments, remote.payments),
  stockAdjustments: mergeCollection(base.stockAdjustments, local.stockAdjustments, remote.stockAdjustments),
});

export const isSameUserData = (a: UserData, b: UserData): boolean => same(a, b);
