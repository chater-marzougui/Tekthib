# useTextDirection Hook

A custom React hook for handling RTL (Right-to-Left) and LTR (Left-to-Right) text direction based on the current language.

## Hooks

### `useTextDirection()`
Returns `"rtl"` or `"ltr"` based on the current language.

**RTL Languages Supported:** Arabic (ar), Hebrew (he), Persian (fa), Urdu (ur)

### `useIsRTL()`
Returns `true` if the current language is RTL, `false` otherwise.

## Usage Examples

### Example 1: Basic Card Component
```tsx
import { useTextDirection } from "@/hooks/useTextDirection";

function MyCard() {
  const direction = useTextDirection();
  
  return (
    <Card dir={direction}>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        Content that respects text direction
      </CardContent>
    </Card>
  );
}
```

### Example 2: Conditional Rendering
```tsx
import { useIsRTL } from "@/hooks/useTextDirection";

function NavigationButtons() {
  const isRTL = useIsRTL();
  
  return (
    <div className="flex gap-2">
      {isRTL ? (
        <>
          <span>⬅️</span>
          <span>Next</span>
        </>
      ) : (
        <>
          <span>Previous</span>
          <span>➡️</span>
        </>
      )}
    </div>
  );
}
```

### Example 3: Dynamic Classes
```tsx
import { useIsRTL } from "@/hooks/useTextDirection";

function FlexContainer() {
  const isRTL = useIsRTL();
  
  return (
    <div className={`flex ${isRTL ? "flex-row-reverse" : "flex-row"} gap-4`}>
      <div>First Item</div>
      <div>Second Item</div>
    </div>
  );
}
```

### Example 4: Text Alignment
```tsx
import { useTextDirection } from "@/hooks/useTextDirection";

function TextBlock() {
  const direction = useTextDirection();
  
  return (
    <div 
      className={`text-${direction === "rtl" ? "right" : "left"}`}
      style={{ textAlign: direction === "rtl" ? "right" : "left" }}
    >
      <p>Text with dynamic alignment</p>
    </div>
  );
}
```

### Example 5: Dialog/Modal
```tsx
import { useTextDirection } from "@/hooks/useTextDirection";

function MyDialog() {
  const direction = useTextDirection();
  
  return (
    <Dialog>
      <DialogContent dir={direction}>
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>
            Description text that respects text direction
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
```

### Example 6: Margin/Padding
```tsx
import { useIsRTL } from "@/hooks/useTextDirection";

function Sidebar() {
  const isRTL = useIsRTL();
  
  return (
    <div className={isRTL ? "mr-4" : "ml-4"}>
      {/* Margin on the start side (left in LTR, right in RTL) */}
    </div>
  );
}
```

### Example 7: Complex Layout
```tsx
import { useTextDirection, useIsRTL } from "@/hooks/useTextDirection";

function ComplexComponent() {
  const direction = useTextDirection();
  const isRTL = useIsRTL();
  
  return (
    <div dir={direction} className="p-4">
      <div className={`flex ${isRTL ? "flex-row-reverse" : "flex-row"} gap-2`}>
        <button className={isRTL ? "ml-auto" : "mr-auto"}>
          {isRTL ? "→ Previous" : "Next →"}
        </button>
      </div>
    </div>
  );
}
```

## Benefits

1. **DRY (Don't Repeat Yourself)**: No need to repeat the language detection logic
2. **Memoized**: Uses `useMemo` for performance optimization
3. **Type-safe**: Returns proper TypeScript types
4. **Consistent**: Centralized RTL language list
5. **Easy to use**: Simple import and single-line usage

## When to Use

Use `dir={direction}` on components where you want the **entire content** to respect text direction, such as:
- Cards with mixed content
- Dialogs and modals
- Chat messages
- Forms
- List items
- Any block of text content

Don't use it on:
- The root `<html>` or `<body>` tag (this should be handled globally by i18n)
- Components that should always be LTR (like code blocks, numbers, etc.)
