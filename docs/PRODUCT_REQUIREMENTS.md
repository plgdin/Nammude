# Product Requirements Document (PRD)

## 1. Executive Summary & Product Vision
The platform is a multi-tenant, cloud-native Restaurant Operating System & SaaS. It enables independent cafés, single-location restaurants, and multi-branch chains to manage end-to-end hospitality operations through a single web and mobile application.

The platform eliminates fractured tools (separate POS, spreadsheet inventory, paper KOTs, disconnected accounting) by providing a centralized operational core:
- **Phase 1 Pilot**: Single-branch specialty café.
- **Scale Target**: Thousands of multi-branch food & beverage tenants on a shared, strictly isolated PostgreSQL architecture.

---

## 2. Target Users & Operational Personas

| Persona | Core Responsibility | Primary Device | Key Needs |
| :--- | :--- | :--- | :--- |
| **Platform Superadmin** | SaaS health, tenant provisioning, subscription billing, system audit | Desktop / Laptop | Global metrics, tenant impersonation (audit logged), plan gating |
| **Restaurant Owner / GM** | P&L oversight, supplier approval, recipe pricing, multi-branch control | Mobile / Desktop | Real-time sales, live labor/food cost %, cash reconciliation, alerts |
| **Branch Manager** | Shift opening/closing, stock counts, wastage approvals, attendance | Tablet / Mobile | Daily cash reconciliation, stock discrepancy reviews, staff rosters |
| **Cashier / POS Operator** | Order capture, bill split, table settlement, discount application | 10" Tablet / Mobile | Ultra-fast tactile input (<3 taps per item), instant thermal print, offline tolerance |
| **Head Chef / Kitchen Staff**| Order preparation, ticket bumping, item 86ing (out of stock) | Wall/Counter Display (KDS) | High-contrast visual cues, prep timers, modifier highlighting, sound alerts |
| **Waiter / Floor Staff** | Table ordering, table status, KOT dispatch, bill request | Mobile (360px-390px) | One-handed mobile ergonomics, real-time table layout, quick modifiers |
| **Inventory Storekeeper** | Goods receipt, PO creation, physical counts, wastage logging | Mobile / Barcode scanner | OCR invoice scan, supplier return notes, batch/expiry alerts |
| **Dine-In Customer** | Digital menu browsing, self-ordering (optional), bill viewing | Mobile Web (BYOD) | Zero-friction load (<100KB initial JS), clear allergens, dietary filters |

---

## 3. Scope of Modules (18 Core Capabilities)

### 3.1 Point of Sale (POS)
- Table-side and counter ordering modes.
- Visual floor map with table states (Vacant, Occupied, Billed, Dirty, Reserved).
- Split bills (by seat, item, or equal split) and merged tables.
- Offline-safe cart state with idempotency tokens to prevent duplicate order generation upon reconnection.

### 3.2 Orders, Billing & Payments
- Immutable order records with lifecycle auditing (`draft` -> `confirmed` -> `in_prep` -> `ready` -> `served` -> `completed` / `cancelled`).
- Multi-tender settlement: Cash, Card, UPI/QR, Digital Wallet, Room/House Account, Custom.
- Discounts (line-item & bill-level) subject to role permissions and mandatory reason logging.
- Tax calculation engine supporting multi-jurisdiction VAT/GST, inclusive/exclusive pricing, and service charge logic.

### 3.3 Table Management
- Dynamic section and table editor (indoor, patio, bar, counter).
- Real-time occupancy tracking and elapsed seating timers.
- Table reservation scheduling with customer contact association.

### 3.4 Kitchen Order Tickets (KOT) & Kitchen Display System (KDS)
- Digital routing of items by kitchen station (e.g., Bar, Grill, Pastry, Cold Prep).
- KOT ticket status lifecycle: `pending` -> `in_progress` -> `completed`.
- Ticket aging color thresholds: Normal (green), Warning (amber), Overdue (flashing red).
- Aggregated kitchen summary view (e.g., "Total 14 Cheeseburgers across 5 active tables").

### 3.5 Digital Menus & QR Ordering
- Dynamic, real-time menu rendering powered by cached tenant catalog.
- QR-code generation linked to branch and specific table tokens.
- Item tags: Vegan, Vegetarian, Gluten-Free, Halal, Spicy levels, Allergen warnings.
- Optional customer self-ordering toggle per branch with payment-first or pay-at-counter workflows.

### 3.6 Ingredient Inventory & Stock Management
- Ingredient-level inventory tracking linked directly to base units (grams, milliliters, pieces).
- Multi-location stock tracking (Main Warehouse, Kitchen Pantry, Bar Store).
- Perpetual inventory management via immutable stock movement ledgers.

### 3.7 Recipes, Yields, Wastage & Expiry
- Bill of Materials (BOM) linking menu items and variants to raw ingredients.
- Dynamic yield and shrinkage percentage modeling.
- Automatic stock deduction upon KOT confirmation or order completion (configurable).
- Wastage logging with mandatory categorization (Spoiled, Burnt, Expired, Spilled) and staff accountability.

### 3.8 Suppliers, Purchase Orders & Goods Receipts
- Supplier directory with payment terms, lead times, and active catalogs.
- Purchase Order (PO) creation, PDF export, and direct email dispatch.
- Goods Receipt Notes (GRN) matching deliveries against POs, with discrepancy tolerances.
- Supplier liability tracking (Accounts Payable ledger).

### 3.9 Expense Tracking & Cash Management
- Petty cash register tracking: Day Open Float, Cash-In, Cash-Out (with attached receipt), and Day End Drop.
- Categorized operating expense (OPEX) recording (Rent, Utilities, Maintenance, Packaging).
- Daily cash drawer reconciliation with automated variance calculation (Expected vs. Actual).

### 3.10 Financial Dashboards & Business Intelligence
- Separation of cash flow vs. revenue recognition.
- True Cost of Goods Sold (COGS) calculation based on consumed inventory.
- Real-time Gross Profit (`Net Revenue - COGS`) and Net Operating Profit (`Gross Profit - OPEX`).
- Shift-end Z-reports and daily operational summaries.

### 3.11 OCR-Based Document & Bill Processing
- Upload processing for thermal merchant receipts, A4 supplier tax invoices, and hand-written slips.
- Asynchronous parsing pipeline generating structured key-value extractions.
- Mandatory human verification UI displaying extracted line items side-by-side with original document image.
- Document status transitions: `uploaded` -> `processing` -> `needs_review` -> `approved` -> `posted` / `rejected`.

### 3.12 Staff Management, Attendance & Duties
- PIN-based quick staff clock-in/clock-out with optional geofencing check.
- Role-based permissions matrix tied to organizational memberships.
- Shift scheduling and digital operational duty checklists (Opening, Shift Handover, Closing).

### 3.13 Cleaning, Hygiene & Compliance
- Digital recurring hygiene logs (fridge temperature logs, deep-clean checklists).
- Expiry tracking and automated reminders for trade licenses, health inspection certificates, and fire safety compliance.

### 3.14 Customer CRM & Loyalty
- Customer profiles linked by phone number or email across orders.
- Dining history, lifetime spend, average ticket value, and favorite items.
- Configurable loyalty engine: Points per spend, visit-based rewards, or tier status.

### 3.15 Multi-Branch Architecture
- Central organization hierarchy with multiple branch locations.
- Branch-specific menus, pricing overrides, tax rates, tables, and stock locations.
- Centralized reporting with cross-branch consolidation and comparison.

### 3.16 SaaS Administration & Subscription Entitlements
- Multi-tier billing plans: Starter (1 branch, basic POS), Growth (recipes + inventory), Pro (multi-branch + OCR + API).
- Feature flags and resource limits (e.g., maximum tables, maximum active staff accounts).
- Self-service tenant registration, subdomain routing, and billing management.

### 3.17 Audit Trails & Notifications
- Immutable, tamper-evident audit log for all financial, security, inventory, and discount events.
- In-app notification bell, sound alerts for kitchen/POS, and webhook/email delivery for high-priority alerts.

### 3.18 Integrations & Future Extensibility
- Webhook dispatch engine for third-party food delivery aggregators, accounting packages, and ERPs.
- Structured REST/GraphQL public API interfaces for future tenant integrations.

---

## 4. Assumptions & Business Decisions

1. **Deployment Currency & Jurisdiction**: 
   - Initial deployment assumes a single configurable base currency per organization (e.g., USD, EUR, INR, AED) with standard 2-decimal formatting (configurable to 3-decimals for specific currencies like KWD/BHD).
   - Taxes are calculated per line item and aggregated to the bill to prevent rounding drift.
2. **Subdomain Routing**:
   - Every tenant is provisioned an immutable slug (e.g., `marian`). Routing uses wildcard DNS (`*.platform.com`).
   - Tenant context is strictly determined by hostname or verified session header, never trusted blindly from client payload.
3. **Inventory Consumption Trigger**:
   - Stock deduction defaults to order placement/KOT generation, with automated reversal if the order is cancelled with an unconsumed state.
4. **Offline Resilience**:
   - The pilot web client will support network drop tolerance (caching active cart and table status locally via IndexedDB) with an explicit conflict resolution policy (server wins, alert cashier). Full offline-first peer-to-peer sync is out of scope for Phase 1.

---

## 5. Non-Functional Requirements & Acceptance Criteria

- **Availability**: 99.9% uptime target for tenant operational POS.
- **Latency**: P95 API response time under 150ms for order placement and table updates.
- **Data Isolation**: 100% tenant data separation enforced at the database layer (PostgreSQL RLS) with zero cross-tenant leak tolerance.
- **Mobile Usability**: Primary cashier, floor, and owner workflows fully functional on viewport widths down to 360px without horizontal scrollbars.
