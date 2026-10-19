# UI/UX Design System & Experience Specification

## 1. Design Principles & Aesthetic Direction

The design system delivers an **ergonomic, high-density, tactile interface** engineered specifically for high-stress hospitality environments (greasy screens, bright sunlight, dim dining rooms, rapid-fire cashier queues).

### Core Tenets
1. **Ergonomic Speed Over Decoration**: Zero decorative bloat. No distracting background gradients, oversized cards, or useless decorative badges. Essential actions must be reachable in 1–2 thumb taps.
2. **Mobile-First Foundation**: Designed fundamentally for **360px and 390px viewport widths** (iPhone and modern Android standards), scaling upward to 10" POS tablets and wide desktop management monitors.
3. **High Tactility & Feedback**: Touch targets must be at least **48x48px** for active cashier and floor actions. Immediate visual and auditory click/tap feedback on KOT dispatch and item selection.
4. **Context-Adaptive Views**: High-contrast dark theme for Kitchen Display Systems (KDS) under hot kitchen lights; clean, high-density light/dark modes for back-office and cashier POS.

---

## 2. Design Tokens & CSS Variable Architecture

All visual styling is controlled via centralized CSS custom properties in `src/design-system/tokens.css`, enabling dynamic tenant theming without separate builds.

```css
:root {
  /* Surface & Backgrounds */
  --bg-canvas: #090d16;
  --bg-surface: #111827;
  --bg-surface-elevated: #1f2937;
  --bg-surface-active: #374151;

  /* Tenant Theme Injection (Configurable via Org Settings) */
  --tenant-primary: #3b82f6;
  --tenant-primary-hover: #2563eb;
  --tenant-primary-fg: #ffffff;
  --tenant-accent: #f59e0b;

  /* Semantic Status Tokens */
  --status-vacant: #10b981;
  --status-occupied: #ef4444;
  --status-billed: #f59e0b;
  --status-reserved: #8b5cf6;
  --status-dirty: #6b7280;

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Layout & Spacing */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --tap-target-min: 48px;
}
```

---

## 3. Screen Family Specifications

### 3.1 Fast Cashier / POS Interface (Mobile 360-390px & Tablet 1024px)
- **Top Bar**: Active Table Number / Order Type badge, Search Input, Quick Cash Drawer indicator.
- **Center Area**: Categorized horizontal pills for fast filtering (Hot Drinks, Cold Brew, Pastries, Sandwiches) followed by a 2-column or 3-column dense grid of item tiles.
- **Bottom Drawer / Right Panel**: Persistent Cart Drawer.
  - One-tap modifier adjustments (+, -, delete).
  - Floating bottom bar with large settlement button: `[ Pay $24.50 ]` (Full width, minimum height 56px).
  - Quick split-bill modal with slider or equal-split selector.

### 3.2 High-Contrast Kitchen Display System (KDS)
- **View Environment**: 1080p wall displays or rugged 12" counter tablets.
- **Theme**: Pure black (`#000000`) canvas with high-contrast colored headers.
- **Card States**:
  - Green Header: Order age < 10 mins.
  - Amber Header: Order age 10–18 mins.
  - Flashing Red Header: Order age > 18 mins.
- **Interaction**: Large "BUMP" button per ticket or per station item. Support for physical wireless USB numeric bump bars.

### 3.3 Public QR Menu & Dine-In Ordering (Zero JS Friction)
- **Viewport**: 100% mobile optimized (360px–420px).
- **Header**: Restaurant logo, table number pill, dietary filter toggles (Veg, Vegan, Gluten-Free, Halal).
- **List Structure**: Vertical infinite scroll with sticky category tabs.
- **Item Drawer**: Clean image, allergen warnings, modifier group selectors with required validation indicators before enabling "Add to Order".

### 3.4 Restaurant Owner & Management Dashboard
- **Layout**: Collapsible left navigation sidebar on desktop; bottom navigation bar on mobile.
- **Header**: Branch switcher dropdown (Single Branch vs All Consolidated) and Date Range picker.
- **Metric Cards**: High-density 4-card row (Net Revenue, Realized COGS, Gross Profit %, Live Open Orders).
- **Responsive Tables**: Desktop tabular view shifts to stacked cards on viewport < 768px with horizontal swipe actions for quick approval/rejection.

---

## 4. Accessibility, States & Interaction Rules

1. **Tap Targets**: All buttons, table cards, and checkboxes adhere to minimum $48 \times 48\text{px}$ touch boundary to prevent mis-taps during rush hours.
2. **State Management UI**:
   - **Loading State**: Subtle skeleton placeholders conforming to layout proportions (avoiding jarring layout shifts / CLS).
   - **Empty States**: Clear icon, concise copy, and a primary call-to-action button (e.g., "No active orders. Open POS to start a sale").
   - **Error Handling**: Non-blocking inline banner with retry action and toast notifications for background sync failures.
   - **Offline State**: Discrete yellow banner at top: `"Offline Mode. Orders queued locally."`
3. **Reduced Motion**: All animations and sheet transitions adhere to `prefers-reduced-motion: reduce`.
