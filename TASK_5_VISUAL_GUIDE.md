# Task 5: Visual Implementation Guide

## Pegboard Selection Interface

### Product Card Layout
```
┌─────────────────────────────────────┐
│ ┌────┐                              │
│ │IMG │  Product Name                │
│ │60x │  $99.99                      │
│ │60  │  Size: 2.0 × 2.0 × 0.1      │
│ └────┘  SKU: PEG-001                │
│         [Featured] [Low Stock]      │
└─────────────────────────────────────┘
```

### Selected State
```
┌═════════════════════════════════════┐ ← Blue border (2px)
║ ┌────┐                          ✓  ║ ← Checkmark indicator
║ │IMG │  Product Name                ║
║ │60x │  $99.99                      ║ ← Blue background
║ │60  │  Size: 2.0 × 2.0 × 0.1      ║
║ └────┘  SKU: PEG-001                ║
║         [Featured]                  ║
╚═════════════════════════════════════╝
```

### Out of Stock State
```
┌─────────────────────────────────────┐
│ ┌────┐                              │ ← 60% opacity
│ │IMG │  Product Name                │ ← Grayed out
│ │60x │  $99.99                      │
│ │60  │  [Out of Stock]              │ ← Red badge
│ └────┘                              │
└─────────────────────────────────────┘
```

## 3D Scene Layout

### Pegboard Positioning
```
        Y (Height)
        ↑
        │
        │    ┌─────────────┐
        │    │             │
        │    │  Pegboard   │  ← Centered at origin
        │    │             │
        │    └─────────────┘
        │
        └──────────────────→ X (Width)
       /
      /
     ↙ Z (Depth)
```

### Grid System Visualization
```
┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤  ← 10cm grid spacing
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
└─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘
```

### Grid Cell Occupation
```
┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
├─┼─╔═╦═╗─┼─┼─┼─┼─┼─┤  ← Occupied cells
├─┼─╠═╬═╣─┼─┼─┼─┼─┼─┤     (marked with ═)
├─┼─╚═╩═╝─┼─┼─┼─┼─┼─┤
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
└─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘
```

## UI Components

### Selected Pegboard Display
```
┌─────────────────────────────────────┐
│ Current Pegboard:                   │
│ ┌═══════════════════════════════┐   │
│ ║ Pegboard Name            [×] ║   │ ← Blue background
│ └═══════════════════════════════┘   │    Remove button
└─────────────────────────────────────┘
```

### Product List Scrollbar
```
┌─────────────────────────────┐
│ Product 1                   │
│ Product 2                   │
│ Product 3                   │ ║ ← Custom scrollbar
│ Product 4                   │ ║    (6px width)
│ Product 5                   │ ║
└─────────────────────────────┘
```

## Color Scheme

### Primary Colors
- **Selected Border**: #007cba (Blue)
- **Selected Background**: #e7f3ff (Light Blue)
- **Hover Background**: #f8f9fa (Light Gray)

### Badge Colors
- **Featured**: #ffd700 (Gold) on #333 (Dark Gray)
- **Out of Stock**: #dc3545 (Red) on white
- **Low Stock**: #ffc107 (Amber) on #333 (Dark Gray)

### Button Colors
- **Remove Button**: #dc3545 (Red)
- **Remove Hover**: #c82333 (Dark Red)

## Interaction States

### Hover Effect
```
Normal → Hover
┌─────┐   ┌─────┐
│     │ → │  →  │  ← Slides 2px right
└─────┘   └─────┘     Blue border
                      Light shadow
```

### Click Effect
```
Hover → Selected
┌─────┐   ┌═════┐
│  →  │ → ║  ✓  ║  ← Checkmark appears
└─────┘   ╚═════╝     Blue background
                      Stronger shadow
```

## Responsive Behavior

### Desktop (> 768px)
```
┌──────────────────────────────────────┐
│  ┌──────────┐  ┌──────────────────┐ │
│  │          │  │  Pegboard List   │ │
│  │  3D      │  │  ┌────────────┐  │ │
│  │  Scene   │  │  │ Product 1  │  │ │
│  │          │  │  └────────────┘  │ │
│  │          │  │  ┌────────────┐  │ │
│  └──────────┘  │  │ Product 2  │  │ │
│                │  └────────────┘  │ │
│                └──────────────────┘ │
└──────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────┐
│  ┌────────────┐  │
│  │            │  │
│  │  3D Scene  │  │
│  │            │  │
│  └────────────┘  │
│                  │
│  Pegboard List   │
│  ┌────────────┐  │
│  │ Product 1  │  │
│  └────────────┘  │
│  ┌────────────┐  │
│  │ Product 2  │  │
│  └────────────┘  │
└──────────────────┘
```

## Animation Timing

- **Hover Transition**: 0.2s ease
- **Selection Transition**: 0.2s ease
- **Camera Movement**: 1.0s ease-in-out cubic
- **Price Update**: 0.3s ease
- **Message Fade**: 0.3s ease

## Accessibility

### Keyboard Navigation
- Tab: Navigate between products
- Enter/Space: Select product
- Escape: Deselect/Close

### Screen Reader Support
- Product names announced
- Prices announced
- Stock status announced
- Selection state announced

### Visual Indicators
- High contrast borders (2px)
- Clear hover states
- Distinct selected state
- Visible focus indicators
