# Implementation Roadmap & Phase Milestones

## 1. Roadmap Overview & Phasing Principles

To eliminate architectural drift, premature optimization, and UI rework, implementation proceeds in 9 strictly sequenced, test-gated phases. **No subsequent phase begins until the current phase passes its Definition of Done (DoD).**

```mermaid
gantt
    title Phased Engineering Roadmap
    dateFormat  YYYY-MM-DD
    section Architectural Core
    Phase 1: Architecture & Design System Spec :done, p1, 2026-10-19, 1d
    Phase 2: Design System & Responsive Prototype :active, p2, 2026-10-20, 3d
    Phase 3: Multi-Tenant Foundation & Database RLS : p3, after p2, 4d
    section Operational Engine
    Phase 4: POS, Tables, KOT & Payment Engine : p4, after p3, 5d
    Phase 5: Inventory, Recipes, Suppliers & POs : p5, after p4, 5d
    Phase 6: Financial Ledgers, COGS & Reporting : p6, after p5, 4d
    section Scale & Automation
    Phase 7: OCR Pipeline, Staff & Compliance : p7, after p6, 4d
    Phase 8: CRM, Loyalty & SaaS Administration : p8, after p7, 3d
    Phase 9: Pilot Deployment, Hardware & 2nd Tenant: p9, after p8, 4d
```

---

## 2. Phase Breakdown & Gate Definitions

### Phase 1: Technical & Product Architecture (Current Phase)
- **Deliverables**: Comprehensive documentation covering PRD, System Architecture, Database Schema, Tenant Security, Financial Model, UI/UX Specification, Performance/Testing, Implementation Roadmap, and Antigravity Workflow.
- **Prerequisites**: Clean workspace.
- **Automated Tests**: Document link validation and markdown linting.
- **Manual Acceptance Checks**: Complete architect and product owner sign-off.
- **Definition of Done**: All 9 architecture documents finalized and committed to `docs/`.

---

### Phase 2: Design System & Responsive Interactive Prototypes
- **Deliverables**:
  - Tailwind CSS design token setup (`tokens.css`) with CSS custom variables for dynamic theming.
  - Shared Radix UI component library (Buttons, Modals, Drawers, Dropdowns, Tabs, Number Pads).
  - High-fidelity responsive prototypes (mocked state):
    1. Fast Cashier POS with Cart & Split Bill Drawer (tested at 360px, 390px, and 1024px).
    2. High-Contrast Kitchen Display System (KDS).
    3. Restaurant Owner KPI Dashboard & Inventory List.
- **Prerequisites**: Phase 1 approval.
- **Automated Tests**: Component unit tests with React Testing Library; a11y axe-core automated audit.
- **Manual Acceptance Checks**: Review interactive tactile feel on physical mobile device. Confirm touch targets $\ge 48\text{px}$.
- **Definition of Done**: Screens approved before any backend integration begins.

---

### Phase 3: Multi-Tenant Foundation, Auth & Database RLS
- **Deliverables**:
  - Supabase project initialization and baseline PostgreSQL migrations (`0001_initial_schema.sql`).
  - Organizations, branches, users, and memberships tables with RLS policies enabled.
  - Tenant hostname routing middleware (Vercel Edge) and subdomain slug validation.
  - Tamper-evident `audit_logs` triggers.
- **Prerequisites**: Phase 2 design system.
- **Automated Tests**: Vitest negative cross-tenant isolation test suite proving Tenant B cannot query Tenant A.
- **Manual Acceptance Checks**: Verify login with multiple user roles (`owner`, `cashier`, `kitchen`) and test tenant switching.
- **Definition of Done**: 100% automated pass on cross-tenant negative isolation test suite.

---

### Phase 4: POS, Menu, Dining Tables, KOT & Payment Engine
- **Deliverables**:
  - Menu catalog management (categories, items, modifier groups).
  - Dining table visual floor plan with real-time status updates via Supabase Realtime.
  - Active POS ordering cart with offline idempotency token generation.
  - Kitchen KOT generation, station routing, and bump bar updates.
  - Multi-tender payment settlement (Cash, Card, Split) and bill printing formatting.
  - Lightweight public customer QR menu (`/m/{branch}/{tableToken}`) respecting the <100KB budget.
- **Prerequisites**: Phase 3 auth and RLS.
- **Automated Tests**: End-to-end Playwright tests for Order -> KOT dispatch -> Payment settlement -> Table status reset.
- **Manual Acceptance Checks**: Verify thermal receipt rendering and KDS sound notifications.
- **Definition of Done**: Zero double-charging risk under simulated network disconnections.

---

### Phase 5: Inventory, Recipes, Suppliers & Goods Receipts
- **Deliverables**:
  - Ingredients catalog with base measurement units (`g`, `ml`, `pcs`).
  - Recipe Bill of Materials (BOM) linking menu items to ingredients with wastage factors.
  - Automated stock deduction trigger upon order fulfillment.
  - Supplier management, Purchase Orders (PO), and Goods Receipt Notes (GRN).
  - Wastage logging with staff attribution and reason classification.
- **Prerequisites**: Phase 4 menu and order system.
- **Automated Tests**: Unit tests for recipe yield calculations and inventory deduction accuracy.
- **Manual Acceptance Checks**: Receive PO delivery, log GRN, and verify perpetual stock movement ledger updates.
- **Definition of Done**: Stock balances derive accurately from immutable `stock_movements`.

---

### Phase 6: Financial Ledgers, Cash Reconciliation & COGS
- **Deliverables**:
  - Cash drawer shift lifecycle: Float open, Cash-in, Cash-out, Blind close, Variance calculation.
  - Daily Z-Report generation and shift history.
  - Real-time COGS calculations using Weighted Average Cost (WAC).
  - P&L financial dashboard: Net Sales, Realized COGS, Gross Profit %, OPEX, and Net Profit.
  - Categorized operating expenses (OPEX) recording.
- **Prerequisites**: Phase 5 inventory and Phase 4 payments.
- **Automated Tests**: Financial math unit test suite covering refunds, discounts, tax splits, and cash variance.
- **Manual Acceptance Checks**: Perform simulated shift with known sales and expenses; reconcile calculated variance against actual count.
- **Definition of Done**: P&L matches double-entry accrual logic with zero discrepancies.

---

### Phase 7: OCR Pipeline, Staff Management & Compliance
- **Deliverables**:
  - Document ingestion vault in Supabase Storage with cryptographic SHA-256 deduplication.
  - Asynchronous OCR Edge Function for thermal receipts and supplier invoices.
  - Human-in-the-loop review UI displaying original document side-by-side with extracted line items.
  - Staff PIN-based timeclock attendance and shift duty checklists.
  - Health & hygiene inspection logs and recurring compliance reminders.
- **Prerequisites**: Phase 5 purchasing and Phase 3 auth.
- **Automated Tests**: Mock OCR extraction tests verifying field parsing tolerances and error fallback.
- **Manual Acceptance Checks**: Upload a sample physical café receipt; verify extraction and human review approval into expenses.
- **Definition of Done**: Unapproved or ambiguous OCR documents never automatically post to financial ledgers.

---

### Phase 8: Customer CRM, Loyalty & SaaS Administration
- **Deliverables**:
  - Customer directory with automated phone-based profile matching and dining history.
  - Configurable loyalty points accrual and redemption engine.
  - SaaS platform superadmin dashboard for subscription tiers, feature flags, and tenant lifecycle.
  - Self-service tenant onboarding flow with instant subdomain provisioning.
- **Prerequisites**: Phases 1–7.
- **Automated Tests**: Tenant onboarding E2E test; subscription plan feature entitlement gating tests.
- **Manual Acceptance Checks**: Provision a new trial tenant through automated onboarding.
- **Definition of Done**: Tier restrictions enforced across all protected modules.

---

### Phase 9: Pilot Deployment, Hardware Validation & Second Tenant Onboarding
- **Deliverables**:
  - Deployment to production Vercel + Supabase infrastructure.
  - Physical hardware testing: ESC/POS thermal receipt printers (USB/Network), cash drawers, and barcode scanners.
  - Automated database backup verification and point-in-time recovery (PITR) test.
  - Onboard Tenant 1 (pilot specialty café) and run live dual-entry parallel operations.
  - Onboard Tenant 2 to demonstrate clean multi-tenant isolation under production load.
- **Prerequisites**: All preceding phases complete.
- **Automated Tests**: Full regression test suite and automated load test (100 concurrent POS transactions).
- **Manual Acceptance Checks**: Full live day in the pilot café with real staff.
- **Definition of Done**: 100% operational uptime across a full week of live trade.
