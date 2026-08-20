---
name: pos-ux-ergonomics
description: Enforce high-speed operator ergonomics, minimal keystrokes, repetitive data-entry shortcuts (chips/datalists), keyboard-first navigation, and data consistency for retail POS and ERP interfaces.
when-to-use: When creating, modifying, or reviewing frontend forms (*Form.tsx), POS/Sales/Purchases dialogs, data-entry tables, or catalog management UI.
user-invocable: true
---

# POS & Operator UX Ergonomics Skill

**Purpose:** Ensure every UI component, form, and interactive flow in NexoPOS is optimized for real-world operator speed, minimal friction in high-volume repetitive tasks, and bulletproof data consistency.

---

## Core Heuristics & Rules

### 1. The Repetitive Entry Rule (1 vs. 50 Test)
Whenever creating or touching a text input field, evaluate:
* *Will the operator type this repeatedly during a workday (e.g., Season, Collection, Brand, Category, Supplier, Notes)?*
* **Rule:** If YES, **NEVER leave a raw unguided `<Input type="text" />`**.
* **Mandatory Pattern:**
  1. **Native `<datalist>` or Autocomplete:** Suggests existing unique values from the database as the user types.
  2. **1-Click Quick Chips:** Display the top 3–4 most common/recent presets as clickable badges right below the input so the user can fill the field in 1 click without touching the keyboard.
  3. **Free-entry fallback:** Allow typing a new value seamlessly if it does not yet exist.

### 2. Anti-Fragmentation of Report & Filter Data
* Any field used for grouping, filtering, or reports (e.g., Seasons, Collections, Categories, Brands, Payment Methods) must offer suggestions to avoid spelling inconsistencies (e.g., preventing `"Invierno"`, `"invierno 2026"`, `"Invierno 2026 "` from fragmenting statistics).

### 3. Keyboard-First & Scanner Ergonomics
* **Auto-Focus:** In checkout (POS), purchases, and barcode dialogs, the primary input (Barcode/Search) must automatically receive focus on open.
* **No Mouse Requirement:** Standard workflows must be operable purely with `Tab`, `Enter`, and shortcut keys (e.g., F1 Buscar, F2 Cantidad, F8 Confirmar, ESC Cancelar).
* **Scanner Safety:** Barcode scanners send a fast stream of characters ending in `Enter`. Ensure forms do not prematurely submit when a barcode is scanned in an auxiliary field.

### 4. Real-Time Previews & Instant Feedback
* **Live Counters:** Matrices, bulk entries, and currency calculations must show live visual feedback (e.g., `"12 SKUs"`, `"Margen: 30%"`, `"Vuelto: $500"`).
* **Async Debounce:** Live search inputs must debounce at 250–300ms with a spinner to avoid lagging the UI.
* **Error Focus:** On form validation failure, scroll to and highlight the first invalid input automatically.

---

## Code Checklist for Frontend Tasks
Before declaring any UI task complete, verify:
- [ ] Are repetitive fields equipped with `<datalist>` or autocompletion?
- [ ] Are high-frequency options available as 1-click chips/buttons?
- [ ] Can the happy path be completed without unnecessary mouse clicks?
- [ ] Does the UI adapt to the active business capability profile (`useCapabilities`)?
- [ ] Was the flow verified visually and functionally via browser?
