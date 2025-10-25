# Z-Index Rotation Animation Guide

## How the Card Stack Works

The AuthCard component implements a sophisticated 3D card stack effect with proper z-index management during rotation.

### Visual Hierarchy

```
       LOGIN MODE          →  ANIMATION  →         SIGNUP MODE

Z-INDEX 4: Main Card (slate-900)
           └─ opacity: 1
           └─ scale: 1.0
           └─ Always on top

Z-INDEX 3: Shadow Card 1 (purple-pink)
           └─ Rotates: -3° → +3°
           └─ Moves: x: -8px ↔ +8px
           └─ Moves: y: -8px ↔ +8px

Z-INDEX 2: Shadow Card 2 (red-purple)
           └─ Rotates: -1.5° → +1.5°
           └─ Moves: x: -4px ↔ +4px
           └─ Moves: y: -4px ↔ +4px

Z-INDEX 1: Background (not visible)
```

### Animation Sequence

```jsx
// LOGIN MODE (isLogin = true)
Shadow Card 1: rotate(-3), x(-8), y(-8), z(3)
Shadow Card 2: rotate(-1.5), x(-4), y(-4), z(2)
Main Card:     z(4)

         ↓ [Toggle to Signup - 500ms transition]

// SIGNUP MODE (isLogin = false)
Shadow Card 1: rotate(+3), x(+8), y(+8), z(3)
Shadow Card 2: rotate(+1.5), x(+4), y(+4), z(2)
Main Card:     z(4)
```

### Implementation Details

Located in `components/auth/AuthCard.tsx`:

```tsx
// Shadow Card 1 - Primary depth layer
<motion.div
  animate={{
    rotate: isLogin ? -3 : 3,        // Flips rotation angle
    x: isLogin ? -8 : 8,              // Flips horizontal offset
    y: isLogin ? -8 : 8,              // Flips vertical offset
    zIndex: isLogin ? 1 : 3,          // Can be enhanced for more depth
  }}
  transition={{ duration: 0.5 }}
/>

// Shadow Card 2 - Secondary depth layer
<motion.div
  animate={{
    rotate: isLogin ? -1.5 : 1.5,
    x: isLogin ? -4 : 4,
    y: isLogin ? -4 : 4,
    zIndex: 2,                        // Stays middle
  }}
  transition={{ duration: 0.5 }}
/>

// Main Card - Always on top
<motion.div
  animate={{ zIndex: 4 }}
/>
```

### Why This Approach Works

1. **3D Illusion**: The offset positions create depth perception
2. **Rotation Exchange**: Cards rotate opposite directions, creating "exchange" effect
3. **Smooth Transitions**: 500ms duration allows eye to follow animation
4. **Z-Index Sync**: All transformations happen simultaneously
5. **Visual Polish**: Purple→Pink and Red→Purple gradients add richness

### Customization Options

To enhance the effect, you can:

```tsx
// Increase depth by adjusting offsets
x: isLogin ? -12 : 12,    // More pronounced shift
y: isLogin ? -12 : 12,    // More pronounced shift
rotate: isLogin ? -5 : 5,  // More dramatic rotation

// Change timing for different feel
transition={{ duration: 0.8, ease: "easeInOut" }}  // Slower, more dramatic
transition={{ duration: 0.3 }}  // Faster, snappier

// Add scale transformation for extra drama
scale: isLogin ? 0.95 : 1.05,  // Cards grow/shrink during flip
```

## Form Progress Indicator

While the card exchanges visually, the **Bluff Meter** on the left updates based on form completion:

```
LOGIN → SIGNUP
0-50%     ↓     50-100%
(2 fields)     (5 fields)

Progress Updates As:
✓ Username/Email filled
✓ Password filled
(Login complete at 50%)
✓ Display Name filled
✓ Confirm Password filled  
(Signup complete at 100%)
```

## Animation Timeline

```
User clicks [Signup] button
          ↓
    500ms animation
          ↓
    Card rotates & offsets change
    Shadow cards exchange z-indices
    Form content fades/slides
          ↓
    Signup form appears
    Bluff meter jumps to 50%+
          ↓
    User starts filling signup fields
    Bluff meter progresses to 100%
```

## Testing the Animation

1. **Visual Test**: Toggle rapidly between Login/Signup - cards should smoothly exchange
2. **Timing Test**: 500ms should feel natural, not jarring or slow
3. **Stacking Test**: Make sure shadow cards don't clip through main card
4. **Form Progress**: Fill fields and watch meter climb from 0→50% (login) or 50→100% (signup)
