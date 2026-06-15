# WealthWise — Premium Design Style Guide

## Design Philosophy
WealthWise uses a **deep navy, charcoal, and gold accent** palette to convey luxury, trust, and premium quality — inspired by high-end fintech applications like private banking dashboards.

---

## 🎨 Color Palette

### Dark Mode (Default)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#060d1a` | Main background |
| `--bg-card` | `#0c1829` | Card backgrounds |
| `--bg-elevated` | `#111f35` | Elevated surfaces |
| `--bg-input` | `#0a1628` | Input fields |
| `--accent` | `#d4a853` | Gold accent (primary CTA) |
| `--accent-hover` | `#e0b96a` | Gold hover state |
| `--success` | `#34d399` | Positive/income |
| `--danger` | `#f87171` | Negative/expense |
| `--warning` | `#fbbf24` | Warning states |
| `--info` | `#60a5fa` | Informational |
| `--text` | `#f1f5f9` | Primary text |
| `--text-secondary` | `#94a3b8` | Secondary text |
| `--text-muted` | `#64748b` | Muted text |

### Light Mode
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#f8f9fb` | Main background |
| `--bg-card` | `#ffffff` | Card backgrounds |
| `--accent` | `#b8860b` | Gold accent (darker for light bg) |
| `--text` | `#0a1628` | Primary text |
| `--text-secondary` | `#4a5568` | Secondary text |

### Accent Gradient
```
Dark: linear-gradient(135deg, #d4a853 0%, #e8c97a 50%, #c9952c 100%)
Light: linear-gradient(135deg, #b8860b 0%, #d4a853 50%, #a07608 100%)
```

---

## 🔤 Typography

**Font Family:** Inter (300, 400, 500, 600, 700, 800, 900)

| Element | Size | Weight | Letter Spacing |
|---------|------|--------|---------------|
| Page Title (h2) | 1.75rem | 800 | -0.03em |
| Section Title (h3) | 1.05rem | 700 | -0.02em |
| Stat Value | 1.9rem | 800 | -0.03em |
| Body Text | 0.88rem | 500 | -0.01em |
| Small Label | 0.78rem | 600 | -0.01em |
| Badge/Tag | 0.7rem | 600 | 0.3px (uppercase) |
| Section Header | 0.68rem | 700 | 0.8px (uppercase) |

---

## 📐 Spacing & Layout

| Token | Value |
|-------|-------|
| Page Padding | 2rem 2.5rem |
| Card Padding | 1.35rem 1.5rem |
| Gap (cards) | 1rem |
| Section Margin | 1.5rem - 2rem |

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 8px | Small elements (badges, chips) |
| `--radius` | 12px | Buttons, inputs, cards |
| `--radius-md` | 16px | Large cards |
| `--radius-lg` | 20px | Modals |
| `--radius-xl` | 28px | Extra large |
| `--radius-full` | 9999px | Pills, circular |

---

## 🎭 Component Rules

### Buttons
- **Primary:** Gold gradient background, dark text (light mode), white text (light mode background)
- **Secondary:** Elevated background with border
- **Ghost:** Transparent with hover state
- All buttons: 0.97 scale on active, translateY(-1px) on hover

### Cards
- Background: `--bg-card`
- Border: 1px solid `--border`
- Shadow: `var(--shadow)`
- Hover: Shadow elevation + translateY(-2px)
- Top gold gradient line on hover (dashboard stat cards)

### Forms
- Input background: `--bg-input`
- Focus: Gold border + 3px gold soft glow
- Consistent padding: 0.75rem 1rem
- Border radius: 12px

### Navigation
- **Sidebar:** Dark navy background with gold accent active states
- Active indicator: 3px gold bar on left edge
- **Bottom Nav:** Glass morphism, gold accent on active
- Active indicator: 3px gold gradient line at top

---

## ✨ Animations & Transitions

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `fadeInUp` | 0.6s | cubic-bezier(0.22, 1, 0.36, 1) | Page entrance |
| `slideUp` | 0.35s | cubic-bezier(0.22, 1, 0.36, 1) | Modal/form entrance |
| `scaleIn` | 0.4s | cubic-bezier(0.34, 1.56, 0.64, 1) | FAB entrance |
| Hover lift | 0.3s | cubic-bezier(0.22, 1, 0.36, 1) | Card hover |
| Progress fill | 0.8s | cubic-bezier(0.22, 1, 0.36, 1) | Progress bars |
| Health score ring | 1.2s | cubic-bezier(0.22, 1, 0.36, 1) | Ring animation |

### Micro-Interactions
- **Button hover:** translateY(-1px) + enhanced shadow
- **Button active:** scale(0.97)
- **Card hover:** translateY(-2px) + shadow elevation + gold top border
- **Nav link hover:** Gold background tint + icon scale(1.08)
- **FAB hover:** translateY(-3px) scale(1.05) + icon rotation
- **Close button hover:** rotate(90deg) with danger color
- **Insight items hover:** translateX(4px) slide

---

## 🌗 Dark / Light Mode

- Dark mode is the **default** (deep navy backgrounds)
- Light mode: Clean white/gray backgrounds with darker gold accent
- Transition: 0.4s cubic-bezier smooth color transitions
- Toggle: Via sidebar footer button (sun/moon icon)
- Persisted to localStorage

---

## 📱 Responsive Breakpoints

| Breakpoint | Layout Changes |
|------------|---------------|
| 1200px+ | 4-column summary cards |
| 1024px | 2-column cards, single-column charts |
| 768px | Mobile: bottom nav visible, sidebar hidden, stacked layout |
| 480px | Full-width cards, stacked forms |

---

## 🏗️ Key Components

1. **Dashboard** — Summary cards (4-col) + health score ring, budget vs actual chart, recommendations, zero-based budget donut, spending insights
2. **Sidebar** — Collapsible with gold accent nav, search bar, support widget, theme toggle
3. **Bottom Nav** — Mobile-only, 4 tabs (Home, Expenses, Reports, Schedule)
4. **Floating Action Button** — Gold gradient, fixed position, "Add Expense" tooltip
5. **Transactions** — Month picker with chips, form with slide-up animation, table with hover states
6. **Modals** — Glassmorphism overlay, slide-up entrance, 90vh max height
7. **Forms** — Gold focus ring, consistent padding, Inter font
8. **Financial Health Score** — SVG ring with animated fill, color-coded status