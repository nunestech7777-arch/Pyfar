# SYSTEM CONTEXT

Last updated: 2026-09-28 (added Manual Stock Adjustment / stockAdjustments; refactored Reports into Visão Geral/Produtos/Lotes/Vendas/A Receber)

> Read this file before exploring the repository.
> Use it as the primary project map.
> Inspect additional files only when necessary for the current task.
> Update this document only when architecture, core business rules, important data models, integrations, or major system flows change.

---

## 1. SYSTEM OVERVIEW

**UNOFAR (TGestoque)** — *"Saúde que conecta você ao futuro"* is a specialized ERP web application designed for **pharmaceutical & vaccine wholesale distributors and commercial representatives** (distribuidora e atacado). 

The system transitions manual paper/notepad operations into an integrated, real-time management platform for:
- Batch-level stock and lot tracking (custo unitário, validade, fornecedores, esgotamento, ajustes).
- Sales order execution with automatic stock deduction and profit calculations.
- Customer management (lojistas, clínicas, consultórios).
- Commission management with automated release proportional to customer payments.
- Accounts receivable (contas a receber) with standard 7-day commercial terms and partial payments.
- Real-time Financial DRE (Demonstrativo de Resultado do Exercício) with interactive drill-down and waterfall auditing.
- Official printable and shareable payment receipts (comprovantes).

The primary user is the wholesale manager/admin (**Hassan** — `hassan@unofar.com.br`), handling commercial dispatch, receivables, cash flow, and rep payouts.

---

## 2. TECH STACK

**Frontend:**
- React 19 (`react`, `react-dom` v19.2)
- TypeScript (`~6.0.2` with strict typing)
- Vite (`v8.3`) as bundler and dev server
- Tailwind CSS v4 (`@tailwindcss/postcss`, PostCSS)
- Lucide React (`lucide-react` for icons)
- Canvas Confetti (`canvas-confetti` for celebratory UI feedback)
- `clsx` & `tailwind-merge` for class compositions

**State Management & Persistence:**
- React Context API (`AppContext.tsx`) as single state coordinator.
- Supabase (`@supabase/supabase-js`): Auth (email/senha) + tabela `public.user_data` (uma linha por usuário, cada coleção em `jsonb`, RLS por `auth.uid()`). Acesso via `cloudStorage` em `src/services/cloudStorage.ts`; salvamento automático com debounce de 600 ms a cada mudança de estado.
- Contas novas começam **vazias** (sem seed). `src/data/initialData.ts` só fornece os defaults do perfil (`initialUser`).
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` em `.env` (ver `.env.example`). Schema em `supabase/migrations/001_user_data.sql` + `002_stock_adjustments.sql` (coluna `stock_adjustments`).

**Linter & Tooling:**
- Oxlint (`oxlint`)
- TypeScript compiler (`tsc -b`)

---

## 3. PROJECT STRUCTURE

```text
src/
├── App.tsx                          # App root with AppProvider and MainRouter
├── main.tsx                         # DOM entrypoint
├── types/
│   └── index.ts                     # Core TypeScript interfaces, unions and domain models
├── context/
│   └── AppContext.tsx               # Primary global state coordinator (Sales, Stock, Finance, Commissions)
├── services/
│   ├── supabase.ts                  # Supabase client (reads VITE_ env vars)
│   └── cloudStorage.ts              # Load/save per-user data in public.user_data
├── data/
│   └── initialData.ts               # Demo data (not loaded); initialUser = profile defaults
├── utils/
│   └── formatters.ts                # Currency, dates, status badges, and overdue math
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx            # Main layout coordinator and modal host
│   │   ├── Header.tsx               # Top bar, notifications, search and profile
│   │   └── Sidebar.tsx              # Primary module navigation
│   ├── common/
│   │   ├── StatCard.tsx             # Metric KPI tile
│   │   ├── DonutChart.tsx           # Category distribution chart
│   │   ├── ChartAreaGradient.tsx    # Weekly/monthly financial area chart
│   │   ├── CalendarWeekStrip.tsx    # 7-day calendar selector
│   │   └── ToastContainer.tsx       # System feedback alerts
│   ├── financial/
│   │   └── FinancialDetailDrawer.tsx # Hierarchical drill-down drawer for DRE & indicators
│   └── modals/
│       ├── NewSaleModal.tsx         # Order entry with lot deduction & 7-day payment logic
│       ├── NewBatchModal.tsx        # Lot intake modal
│       ├── NewClientModal.tsx       # Customer registration modal
│       ├── NewCommissionerModal.tsx # Sales rep registration modal
│       ├── RecordPaymentModal.tsx   # Receivables settlement modal
│       ├── NewExpenseModal.tsx      # Manual operating expense entry modal
│       ├── AdjustStockModal.tsx     # Manual stock adjustment modal (add/remove/set + reason + audit)
│       └── ReceiptModal.tsx         # Official printable receipt modal
├── pages/
│   ├── DashboardPage.tsx            # Overview metrics, charts, quick actions
│   ├── StockPage.tsx                # Inventory lot table and stock health
│   ├── StockEntryPage.tsx           # Formal lot intake page with cost calculations
│   ├── SalesPage.tsx                # Orders list and margins
│   ├── ClientsPage.tsx              # Customer list and order statistics
│   ├── CommissionersPage.tsx        # Sales representatives and unit commission rates
│   ├── CommissionsMapPage.tsx       # Representative commission release & payout tracking
│   ├── ReceivablesPage.tsx          # Accounts receivable & payment recording (operational, unfiltered)
│   ├── FinancialPage.tsx            # DRE summary, 6-tab financial navigation & drill-down
│   ├── ReportsPage.tsx              # Reports container: period/filter state + 5-tab nav + drawer host
│   ├── ReceiptsPage.tsx             # Receipt repository
│   ├── SettingsPage.tsx             # Profile (name, company, avatar upload) and JSON backup; login e-mail/password and data reset are managed only in Supabase
│   └── LoginPage.tsx                # Supabase Auth login (email/senha)
└── pages/reports/                   # Reports data layer + tabs (see section 4.6 and 8.5)
    ├── reportsData.ts               # Pure functions: period ranges, filtering, per-product/per-lot aggregation
    ├── PeriodFilterBar.tsx          # Period pills + "Mais filtros" (produto/cliente/lote/vendedor/pagamento/status)
    ├── OverviewTab.tsx              # 5 main cards + comparison + minimal charts + resultado por produto
    ├── ProductsTab.tsx              # Per-product cards (dynamic, keyed by vaccineName)
    ├── LotsTab.tsx                  # Per-lot cards (keyed by VaccineBatch.id)
    ├── SalesTab.tsx                 # Simplified sales table/cards
    ├── ReceivablesTab.tsx           # A Receber: vencendo hoje/7 dias/vencidos + client list (not period-filtered)
    └── ReportsDetailDrawer.tsx      # Drill-down drawer (own history stack, same UX as FinancialDetailDrawer)
```

---

## 4. CORE MODULES

### 1. Financial & Cash Flow (`FinancialPage.tsx` & `FinancialDetailDrawer.tsx`)
- **Purpose**: Global DRE management, ledger entries, and auditability.
- **Responsibilities**:
  - Top DRE banner (Total Faturado, Lucro Bruto, Despesas + Comissões, Lucro Líquido).
  - Bottom DRE indicators (Estoque Comprado, Saldo a Receber, Em Atraso, Comissões Pendentes).
  - 6-tab navigation: `Visão Geral / Todos`, `Entradas`, `Saídas`, `Despesas`, `Comissões`, `Contas a Receber`.
  - Hierarchical right slide-in drawer with navigation history (`← Voltar`) for total explainability.
- **Data Sources**: `sales`, `financialTransactions`, `commissions`, `batches`.

### 2. Sales & Orders (`SalesPage.tsx` & `NewSaleModal.tsx`)
- **Purpose**: Commercial order generation and lot allocation.
- **Responsibilities**:
  - Multi-item order composition with batch selection, expiration warnings, and real-time margin computation.
  - Automatic inventory deduction per batch.
  - Commercial payment terms (`À Vista` vs `A Prazo` with default 7-day term).
- **Data Sources**: `sales`, `batches`, `clients`, `commissions`.

### 3. Inventory & Lot Control (`StockPage.tsx` & `StockEntryPage.tsx`)
- **Purpose**: Batch-level inventory and expiration monitoring.
- **Responsibilities**:
  - Quantity tracking per lot (`initialQuantity`, `currentQuantity`).
  - Unit cost tracking (`unitCost`) and stock valuation.
  - Expiration monitoring (`ativo`, `esgotado`, `vencido`).
  - Generating automatic financial outflow (`compra_estoque`) on new batch entry.
  - **Manual stock adjustment** (`AdjustStockModal.tsx` → `adjustStock`): corrects divergences between physical and system stock (Adicionar / Remover / Definir quantidade) with mandatory reason and full audit trail. Never edits `currentQuantity` directly from a form field — every change is computed server-side (in `AppContext`) and logged as a `StockAdjustment`.
- **Data Sources**: `batches`, `financialTransactions`, `stockAdjustments`.

### 4. Accounts Receivable (`ReceivablesPage.tsx` & `RecordPaymentModal.tsx`)
- **Purpose**: Managing outstanding debtor balances and customer settlements.
- **Responsibilities**:
  - Tracking `remainingBalance`, `dueDate`, and `daysOverdue`.
  - Partial or full payment settlement (`recordPayment`).
  - Generating automatic financial inflow (`recebimento_parcela`) and releasing proportional rep commissions.
- **Data Sources**: `sales`, `payments`, `commissions`, `financialTransactions`.

### 5. Commissions (`CommissionersPage.tsx` & `CommissionsMapPage.tsx`)
- **Purpose**: Managing sales representatives and commission rules.
- **Responsibilities**:
  - Rep registration with default rate per unit (`ratePerUnit`).
  - Auto-generating `CommissionEntry` upon sale creation.
  - Proportional release of commission based on customer payment progress: `(paidAmount / totalAmount) * totalCommission`.
  - Paying commissions (`payCommission`), triggering automatic financial outflow (`comissao_paga`).
- **Data Sources**: `commissioners`, `commissions`, `sales`.

### 6. Reports & BI (`ReportsPage.tsx` + `src/pages/reports/*`)
- **Purpose**: "Resumo primeiro, detalhes sob demanda" analysis surface — answer Vendas/Recebido/A Receber/Custo/Lucro in seconds, then drill down.
- **Responsibilities**:
  - 5-tab navigation: `Visão Geral`, `Produtos`, `Lotes`, `Vendas`, `A Receber` (replaces the old flat multi-tab table view).
  - Period filter (Hoje/Ontem/7d/30d/Este mês/Mês anterior/Personalizado) + optional dimension filters (produto, cliente, lote, vendedor = `commissionerId`, forma de pagamento, status), shared by all tabs via `ReportsFilters`.
  - `reportsData.ts` is the single source of truth for every number shown: `computeTotals`, `computeProductSummaries`, `computeLotSummaries`, `allocateItems`. No tab or drawer recomputes these independently.
  - Every card/row opens `ReportsDetailDrawer.tsx` (own drill-down history stack, mirrors `FinancialDetailDrawer.tsx`'s UX) down to product/lot/sale/client detail, including per-sale payment history (`payments` by `saleId`).
  - CSV export and print respect the active period + filters (export the same `filteredSales` the screen shows).
- **Data Sources**: `sales`, `batches`, `payments`, `clients`, `commissioners` (all derived in-memory, same pattern as the rest of the app — no new backend layer).

---

## 5. CORE BUSINESS RULES

### Sales & Commercial Payment Rules (PARTE 26 Standard)
1. **Commercial Term Standard**:
   - Venda A Prazo standard term is **7 days** (`dueDate = saleDate + 7 days`).
   - Quick selectable presets: `7 days`, `14 days`, `21 days`, `30 days`, or `Personalizado` (custom days or exact calendar date).
2. **Payment Condition**:
   - `À Vista`: 100% paid immediately (`downPayment = totalAmount`), entered into cash flow, `remainingBalance = 0`, status `pago`.
   - `A Prazo`: Down payment can be `R$ 0,00` (100% credit) or partial (`downPayment > 0`).
3. **Cash Flow vs Receivable Split**:
   - `downPayment` enters cash flow (`financialTransactions`) immediately as `entrada`.
   - `remainingBalance` (`totalAmount - downPayment`) is recorded as account receivable.
4. **Sale Status Progression**:
   - `pago`: `remainingBalance <= 0`.
   - `parcialmente_pago` (Parcial): `paidAmount > 0`, `remainingBalance > 0`, and `today <= dueDate`.
   - `pendente` (A Receber): `paidAmount === 0`, `remainingBalance > 0`, and `today <= dueDate`.
   - `atrasado` (Vencido): `remainingBalance > 0` and `today > dueDate`.

### Inventory Rules
1. Batch current quantity cannot become negative (`Math.max(0, currentQuantity - quantity)`).
2. When `currentQuantity === 0`, batch status changes to `esgotado`.
3. Expired lot warning prompts operator confirmation before proceeding with a sale.
4. Batch intake immediately generates a corresponding financial outflow transaction of type `compra_estoque`.

### Manual Stock Adjustment Rules (`adjustStock`)
1. `currentQuantity` is **never** edited directly; every manual change goes through `adjustStock` in `AppContext.tsx`, which computes the result and writes a `StockAdjustment` audit record.
2. Three adjustment types: `adicionar` (delta must be > 0), `remover` (delta must be > 0 and `<= currentQuantity`), `definir` (absolute target `>= 0`; the signed delta vs. the current quantity is what gets logged).
3. Resulting quantity can never be negative; a `remover`/`definir` that would produce a negative stock is rejected before any state mutation.
4. `reasonLabel` (motivo) is mandatory; `reason: 'outro'` requires the operator to type a free-text label — enforced in `AdjustStockModal.tsx` and re-validated in `adjustStock`.
5. Every adjustment is appended to `stockAdjustments` (never mutated/deleted) with `previousQuantity`, `adjustmentQuantity` (signed), `newQuantity`, `reason`, `notes`, `userId`/`userName`, and `createdAt`.
6. Batch `status` is recalculated the same way as elsewhere (`esgotado` at 0, `vencido` if past `expirationDate`, else `ativo`).

### Commission Release Rules
1. Commissions are earned per unit sold: `totalCommission = totalQuantity * ratePerUnit`.
2. Released commission is **strictly proportional** to customer cash payment:
   $$\text{releasedCommission} = \text{totalCommission} \times \left( \frac{\text{paidAmount}}{\text{totalAmount}} \right)$$
3. Representative payout is only permitted up to `releasedCommission - paidCommission`.
4. Marking commission as paid generates financial outflow (`comissao_paga`).

### Reports Reconciliation Rules (`src/pages/reports/reportsData.ts`)
1. **Vendas = Recebido + A Receber, always**, for any period/filter combination: both are derived from the *same* `filteredSales` set (`vendas = Σ totalAmount`, `recebido = Σ paidAmount`, `aReceber = vendas - recebido`). Never compute "recebido" from a different date range (e.g. `PaymentRecord.paymentDate`) than "vendas" — that would break the invariant and is why period filtering uses `Sale.createdAt`, not payment dates.
2. **Custo/Lucro use historical cost, never current cost**: always read `SaleItem.unitCost` / `SaleItem.totalCost` / `Sale.totalCost` (frozen at sale time), never `VaccineBatch.unitCost` (which could differ if a batch's cost is ever edited later). This is what makes old sales immune to future cost changes.
3. **Per-product/per-lot aggregation never double-counts a multi-item sale**: `allocateItems()` walks `sale.items[]` (not `sale.totalAmount`) so revenue/cost/profit per product or lot sum back exactly to the sale's totals, even with items from different products/lots in one sale.
4. **Per-product/per-lot "paid"/"remaining" are a proportional allocation**, not tracked separately per item (the data model only tracks payments at the sale level via `PaymentRecord`): `itemPaid = sale.paidAmount * (item.totalPrice / sale.totalAmount)`, same for `itemRemaining`. This is an approximation by construction — documented so nobody "fixes" it into something that silently breaks reconciliation.
5. **A Receber tab is intentionally not period-filtered** (`ReceivablesTab.tsx` uses full `sales`, only applying the non-date dimension filters): a debt from a prior period is still real debt today, and hiding it under a narrow period like "Hoje" would be actively misleading for collections.

---

## 6. FINANCIAL RULES AND FORMULAS

All financial numbers across Cards, Tabs, and the Detail Drawer must **reconcile 100%**:

### 1. Total Faturado (Gross Revenue)
- **Definition**: Total invoiced revenue across all non-cancelled sales.
- **Source**: `sales.filter(s => s.status !== 'cancelado')`
- **Formula**:
  $$\text{Total Faturado} = \sum \text{sale.totalAmount}$$

### 2. Custo das Mercadorias Vendidas (CMV)
- **Definition**: Acquisition cost of all sold batches.
- **Source**: `sales.filter(s => s.status !== 'cancelado')`
- **Formula**:
  $$\text{CMV} = \sum \text{sale.totalCost} = \sum (\text{item.quantity} \times \text{batch.unitCost})$$

### 3. Lucro Bruto (Gross Profit)
- **Definition**: Trading profit before operational expenses and rep commissions.
- **Formula**:
  $$\text{Lucro Bruto} = \text{Total Faturado} - \text{CMV}$$
  $$\text{Margem Bruta \%} = \left( \frac{\text{Lucro Bruto}}{\text{Total Faturado}} \right) \times 100$$

### 4. Despesas Operacionais
- **Definition**: Manual administrative, logistics, rent, fuel, and fixed/variable expenses.
- **Source**: `financialTransactions.filter(f => f.type === 'saida' && !f.isAutomatic)`
- **Formula**:
  $$\text{Despesas} = \sum \text{transaction.amount}$$

### 5. Comissões Pagas
- **Definition**: Commissions actually disbursed to sales representatives.
- **Source**: `commissions`
- **Formula**:
  $$\text{Comissões Pagas} = \sum \text{commission.paidCommission}$$

### 6. Lucro Líquido Estimado (Net Profit)
- **Definition**: True net business earnings.
- **Formula**:
  $$\text{Lucro Líquido} = \text{Lucro Bruto} - \text{Despesas Operacionais} - \text{Comissões Pagas}$$
  $$\text{Margem Líquida \%} = \left( \frac{\text{Lucro Líquido}}{\text{Total Faturado}} \right) \times 100$$

### 7. Estoque Comprado (Total Stock Purchased)
- **Definition**: Cumulative historical investment in batch purchases.
- **Source**: `batches`
- **Formula**:
  $$\text{Estoque Comprado} = \sum (\text{batch.initialQuantity} \times \text{batch.unitCost})$$

### 8. Saldo a Receber (Prazo)
- **Definition**: Total open balance owed by customers.
- **Source**: `sales.filter(s => s.status !== 'cancelado')`
- **Formula**:
  $$\text{Saldo a Receber} = \sum \text{sale.remainingBalance}$$

### 9. Em Atraso (Vencido)
- **Definition**: Outstanding balance where `dueDate < today`.
- **Source**: `sales.filter(s => s.status === 'atrasado' || (s.remainingBalance > 0 && today > s.dueDate))`
- **Formula**:
  $$\text{Total Vencido} = \sum \text{overdueSale.remainingBalance}$$

### 10. Comissões Pendentes
- **Definition**: Generated commissions not yet fully paid to reps.
- **Source**: `commissions.filter(c => c.status !== 'paga' && c.status !== 'cancelada')`
- **Formula**:
  $$\text{Comissões Pendentes} = \sum (\text{c.totalCommission} - \text{c.paidCommission})$$

---

## 7. DATA SOURCES / SOURCE OF TRUTH

All data structures are typed in `src/types/index.ts` and managed in `src/context/AppContext.tsx`.

### `Sale`
- **Key Identifier**: `id` (`sal-...`), `saleNumber` (`VEN-YYYY-XXX`).
- **Main Fields**: `clientId`, `items[]`, `totalQuantity`, `totalCost`, `totalAmount`, `grossProfit`, `paymentMethod`, `downPayment`, `paidAmount`, `remainingBalance`, `dueDate`, `status`, `commissionerId`.
- **Relationships**: Belongs to `Client`; Contains `SaleItem[]`; Linked to `CommissionEntry` & `PaymentRecord[]`.

### `VaccineBatch`
- **Key Identifier**: `id` (`bat-...`), `lotNumber` (e.g. `HEX-7741`).
- **Main Fields**: `vaccineName`, `manufacturer`, `initialQuantity`, `currentQuantity`, `unitCost`, `entryDate`, `expirationDate`, `status` (`ativo` | `esgotado` | `vencido`).

### `Client`
- **Key Identifier**: `id` (`cli-...`).
- **Main Fields**: `name`, `storeName`, `phone`, `cnpj`, `city`, `address`, `commissionerId`, `status`.

### `Commissioner`
- **Key Identifier**: `id` (`com-...`).
- **Main Fields**: `name`, `phone`, `defaultRatePerUnit`, `status`.

### `CommissionEntry`
- **Key Identifier**: `id` (`comm-...`).
- **Main Fields**: `saleId`, `saleNumber`, `commissionerId`, `totalUnits`, `ratePerUnit`, `totalCommission`, `releasedCommission`, `paidCommission`, `status`.

### `FinancialTransaction`
- **Key Identifier**: `id` (`fin-...`).
- **Main Fields**: `type` (`entrada` | `saida`), `category`, `categoryLabel`, `description`, `amount`, `date`, `referenceId`, `isAutomatic`.

### `PaymentRecord`
- **Key Identifier**: `id` (`pay-...`).
- **Main Fields**: `saleId`, `clientId`, `amount`, `paymentDate`, `paymentMethod`, `notes`.

### `StockAdjustment`
- **Key Identifier**: `id` (`adj-...`).
- **Main Fields**: `batchId`, `vaccineName`, `lotNumber`, `previousQuantity`, `adjustmentQuantity` (signed), `newQuantity`, `type` (`adicionar` | `remover` | `definir`), `reason`, `reasonLabel`, `notes`, `userId`, `userName`, `createdAt`.
- **Relationships**: Belongs to `VaccineBatch`. Append-only audit log — never edited or deleted by the UI.

---

## 8. CRITICAL FLOWS

### 1. Sale Order Execution Flow (`addSale`)
```text
NewSaleModal Submit
  │
  ├── Validate batches & quantity availability
  ├── Deduct batch inventory: currentQuantity -= item.quantity
  ├── Create Sale record (VEN-YYYY-XXX)
  ├── IF downPayment > 0:
  │     ├── Register Financial Inflow ('entrada_venda' or 'venda_a_vista')
  │     └── Create PaymentRecord for down payment
  ├── IF client has commissioner:
  │     └── Create CommissionEntry (releasedCommission proportional to down payment)
  ├── Save all states (auto-persisted to Supabase)
  └── Trigger Confetti & Success Toast
```

### 2. Debt Payment Settlement Flow (`recordPayment`)
```text
RecordPaymentModal Submit
  │
  ├── Validate payAmount <= sale.remainingBalance
  ├── Update Sale: paidAmount += payAmount, remainingBalance -= payAmount
  ├── Update Sale Status: 'pago' if remainingBalance === 0, else 'parcialmente_pago' / 'atrasado'
  ├── Create PaymentRecord
  ├── Register Financial Inflow ('recebimento_parcela')
  ├── IF sale has commission:
  │     └── Update CommissionEntry: recalculate releasedCommission based on new paidAmount
  └── Save all states (auto-persisted to Supabase)
```

### 3. Batch Stock Intake Flow (`addBatch`)
```text
StockEntryPage / NewBatchModal Submit
  │
  ├── Calculate totalPurchaseCost = initialQuantity * unitCost
  ├── Create VaccineBatch record
  ├── Register Financial Outflow ('compra_estoque')
  └── Save all states (auto-persisted to Supabase)
```

### 4. Manual Stock Adjustment Flow (`adjustStock`)
```text
StockPage row "Ajustar estoque" (Edit3 icon) Click
  │
  ├── Open AdjustStockModal with the selected VaccineBatch
  ├── Operator picks type (Adicionar / Remover / Definir quantidade), quantity, motivo (+ observação)
  ├── Live preview: estoque atual → ajuste → novo estoque
  ├── Submit → AppContext.adjustStock(...)
  │     ├── Validate: integer quantity, > 0 (or >= 0 for 'definir'), motivo obrigatório, remover <= currentQuantity, resultado >= 0
  │     ├── Compute previousQuantity / newQuantity / signed delta from current batches state
  │     ├── Update VaccineBatch.currentQuantity + status ('esgotado' at 0)
  │     └── Append StockAdjustment record to stockAdjustments (audit trail)
  ├── Save all states (auto-persisted to Supabase, incl. new `stock_adjustments` column)
  └── Success Toast; table/cards recompute automatically (stock is derived from `batches`)
```

### 5. Interactive Financial Drill-Down Flow (`FinancialDetailDrawer`)
```text
Click DRE Card or Indicator on FinancialPage
  │
  ├── Open FinancialDetailDrawer with type ('revenue' | 'gross_profit' | 'net_profit' | etc.)
  ├── User clicks deeper item (e.g., Sale or Commission)
  ├── Push new level to drawer history stack
  ├── Display child view (e.g., itemized lot costs and margins)
  └── User clicks '← Voltar' to pop history stack or 'X' to close
```

---

## 9. IMPORTANT FILES

- [`src/context/AppContext.tsx`](file:///Users/nunes/Documents/Tgestoque/src/context/AppContext.tsx): Central business logic state coordinator. All state modifications (add, update, delete, cancel, pay) are here.
- [`src/types/index.ts`](file:///Users/nunes/Documents/Tgestoque/src/types/index.ts): Strict domain model types, enums, categories, and navigation routes.
- [`src/services/cloudStorage.ts`](file:///Users/nunes/Documents/Tgestoque/src/services/cloudStorage.ts): Supabase persistence (`public.user_data`).
- [`src/pages/FinancialPage.tsx`](file:///Users/nunes/Documents/Tgestoque/src/pages/FinancialPage.tsx): Main Financial & DRE dashboard with 6 tabs.
- [`src/components/financial/FinancialDetailDrawer.tsx`](file:///Users/nunes/Documents/Tgestoque/src/components/financial/FinancialDetailDrawer.tsx): Reusable right slide-in drawer with navigation history stack for all 8 DRE indicators.
- [`src/components/modals/NewSaleModal.tsx`](file:///Users/nunes/Documents/Tgestoque/src/components/modals/NewSaleModal.tsx): Order creation modal featuring the 7-day payment logic.
- [`src/components/modals/AdjustStockModal.tsx`](file:///Users/nunes/Documents/Tgestoque/src/components/modals/AdjustStockModal.tsx): Manual stock correction modal (Adicionar/Remover/Definir + motivo obrigatório + observação + preview + histórico recente do lote).
- [`src/utils/formatters.ts`](file:///Users/nunes/Documents/Tgestoque/src/utils/formatters.ts): Centralized currency (`BRL`), date (`DD/MM/YYYY`), overdue math, and status badges.
- [`src/pages/reports/reportsData.ts`](file:///Users/nunes/Documents/Tgestoque/src/pages/reports/reportsData.ts): Single source of truth for every Reports number (period ranges, filtering, per-product/per-lot aggregation). See section 5, "Reports Reconciliation Rules", before touching this file.
- [`src/pages/reports/ReportsDetailDrawer.tsx`](file:///Users/nunes/Documents/Tgestoque/src/pages/reports/ReportsDetailDrawer.tsx): Reports' own drill-down drawer (product/lot/sale/client detail), separate from `FinancialDetailDrawer.tsx` since the two pages have different card taxonomies.

---

## 10. PROJECT CONVENTIONS

1. **Terminology**:
   - Use **"Quantidade" / "un"** (NOT "doses").
   - Use **"Vendas"** (NOT "Pedidos").
   - Use **"Estoque"** (NOT "Vacinas").
   - Use **"Clientes"** (NOT "Lojistas" as module name).
   - Operator user name is **"Junior"**.
2. **Currency & Formatting**:
   - Always format money via `formatCurrency(val)` (`R$ 1.250,00`).
   - Always format dates via `formatDate(isoString)` (`DD/MM/YYYY`).
3. **Status Badges**:
   - `Pago`: Emerald badge.
   - `Parcial`: Amber badge.
   - `A Receber`: Blue badge.
   - `Vencido`: Rose/Red badge.
4. **Single Source of Truth**:
   - Never implement a second calculation path in a drawer or component. Derive all metrics directly from `AppContext` collections.

---

## 11. UI / DESIGN SYSTEM

- **Theme & Aesthetics**: Dark hero cards (`bg-slate-900`, `from-slate-900 to-blue-950`), electric blue accent (`#2563eb` with glow), clean white cards (`rounded-2xl`, `rounded-3xl`), soft slate borders (`border-slate-100`/`border-slate-200`).
- **Drawers & Modals**:
  - Right slide-over drawer (`max-w-2xl` on desktop, ~100% on mobile) with backdrop blur.
  - Centered modals with smooth zoom-in and fade-in animations.
- **Responsiveness**: Mobile navigation via collapsible bottom/drawer layout; data tables with smooth localized horizontal scroll or responsive cards.

---

## 12. SECURITY & ACCESS MODEL

- **Authentication**: Supabase Auth (`supabase.auth.signInWithPassword`) via `AppContext.login(email, password)`; sessão restaurada no carregamento (`isLoadingSession`). Cadastro público desativado no painel do Supabase; contas são criadas pelo admin. Conta principal: `juniortg@gmail.com`.
- **Data isolation**: RLS em `public.user_data` (`auth.uid() = user_id`).
- **Role Model**: `User.role` (`admin` | `operador`).
- **Data Protection**: Client-side sanitized forms; non-destructive validation preventing negative quantities or payments exceeding remaining balance.
- **Stock Adjustment Auditability**: `adjustStock` never writes `currentQuantity` from raw form input — it always recomputes previous/new quantity and rejects invalid states (negative result, non-integer, removal exceeding stock, missing motivo). Every accepted adjustment is appended to `stockAdjustments`, which is never mutated or deleted by the UI. Same RLS as the rest of `user_data` protects it (no separate table/policy needed).

---

## 13. DO NOT BREAK

1. **Do not duplicate financial logic**: Ensure all drawer and page metrics match `AppContext` calculations to the cent.
2. **Do not remove the 7-day default commercial term** for credit sales (`A Prazo`).
3. **Do not remove proportional commission release logic**: Reps can only be paid commissions proportional to collected client payments.
4. **Do not save before load**: `AppContext` só persiste depois que `loadedUserIdRef` é definido, para não sobrescrever os dados da nuvem com o estado vazio inicial. Não carregue dados de demonstração em contas reais.
5. **Do not reintroduce "doses" terminology**: Maintain "Quantidade" / "un".
6. **Do not create standalone routes for drill-downs**: Keep `FinancialPage.tsx` drill-downs within `FinancialDetailDrawer.tsx`, and Reports drill-downs within `ReportsDetailDrawer.tsx` (the two are intentionally separate drawers — different card taxonomies — not one to merge without a real reason).
7. **Do not compute Reports "Recebido" from `PaymentRecord.paymentDate`**: it must come from `Sale.paidAmount` of the same period-filtered sale set as "Vendas", or the `Vendas = Recebido + A Receber` reconciliation breaks (see section 5, Reports Reconciliation Rules).

---

## 14. KNOWN RISKS / TECHNICAL DEBT

1. **Single-row jsonb storage**: Todos os dados da conta ficam em uma linha e são regravados inteiros a cada alteração. Com milhares de registros, migrar para tabelas relacionais (sales, batches, etc.). Não há controle de concorrência entre abas/dispositivos abertos ao mesmo tempo (a última gravação vence).
2. **InMemory Filtering**: Filtering and calculations are performed in-memory on React render. For larger datasets, indexed queries or backend views will be required.
3. **`User.role` is not enforced anywhere in the UI**: the field exists (`admin` | `operador`) but no page or action currently checks it — the app assumes a single trusted operator per account. Any future "who can do X" requirement (e.g., restricting stock adjustments to admins) needs this gate to be built from scratch, consistently, across all sensitive actions — not bolted onto a single feature.

---

## 15. NEW AI CHECKLIST

Before implementing any task in this repository:

1. Read `SYSTEM_CONTEXT.md`.
2. Identify the affected module in `src/pages/` or `src/components/`.
3. Check `src/types/index.ts` for existing types and interfaces.
4. Confirm the source of truth in `src/context/AppContext.tsx`.
5. Reuse existing helper functions from `src/utils/formatters.ts`.
6. Avoid creating duplicate state or calculation logic.
7. Preserve existing naming and design conventions.
8. Implement the smallest necessary change.
9. Validate affected flows by running `npm run build` (`tsc -b && vite build`).
10. Update `SYSTEM_CONTEXT.md` only if the change affects architecture, core rules, data models, or critical system flows.
