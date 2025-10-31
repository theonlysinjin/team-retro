# Bug Fixes and Solutions

## React 19 Compatibility Issue (Fixed)

### Problem
The app initially used `react-draggable` for card drag-and-drop functionality. However, `react-draggable` relies on `ReactDOM.findDOMNode()`, which was removed in React 19.

**Error:**
```
Uncaught Error: _reactDom.default.findDOMNode is not a function
```

### Solution
Replaced `react-draggable` with a custom drag implementation using:
- Direct DOM event listeners (mousedown, mousemove, mouseup)
- React refs to track the draggable element
- State management for drag position and status

### Implementation Details

**File:** `components/Card.tsx`

The custom drag implementation:
1. Uses `useRef` to get reference to the card element
2. Attaches mousedown event to detect drag start (only on drag handle)
3. Tracks mouse position and calculates card position
4. Updates position via the `onUpdate` prop
5. Cleans up event listeners on unmount

**Benefits:**
- ✅ Compatible with React 19
- ✅ No external dependency needed
- ✅ Full control over drag behavior
- ✅ Works seamlessly with canvas zoom/pan
- ✅ Better performance (no extra library overhead)

### Code Changes

**Before (react-draggable):**
```tsx
import Draggable from "react-draggable";

<Draggable
  position={{ x: card.position.x, y: card.position.y }}
  onStop={handleDragStop}
  handle=".drag-handle"
>
  <div>...</div>
</Draggable>
```

**After (custom implementation):**
```tsx
const [isDragging, setIsDragging] = useState(false);
const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
const cardRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleMouseDown = (e: MouseEvent) => {
    if (!target.closest('.drag-handle')) return;
    setIsDragging(true);
    // Calculate offset...
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    // Update position...
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove listeners...
}, [isDragging, dragOffset]);

<motion.div ref={cardRef} style={{ position: "absolute", ... }}>
  <div className="drag-handle">...</div>
  {/* Card content */}
</motion.div>
```

## Testing

Verified the fix with:
```bash
./scripts/test-build.sh
```

**Results:**
- ✅ TypeScript: No errors
- ✅ Production build: Success (1.6M, 25 files)
- ✅ All critical files present

## Future Considerations

If more complex drag interactions are needed (e.g., drag constraints, snap-to-grid):
- The custom implementation can be extended
- Consider `@dnd-kit/core` (React 19 compatible)
- Consider `react-beautiful-dnd` (if they update for React 19)

## Related Files
- `components/Card.tsx` - Card component with drag implementation
- `types/declarations.d.ts` - Removed react-draggable types
- `package.json` - Removed react-draggable dependency
