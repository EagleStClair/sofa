import { useRef } from "react";

/**
 * Long-press (touch or mouse) and right-click on an element. Spread `handlers` onto
 * the element and call `consumeLongPress()` first in its onClick: it returns true
 * once when the click belongs to a long press and should be ignored.
 */
export function useLongPress(onLongPress: () => void, delayMs = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fired = useRef(false);

  function clear() {
    clearTimeout(timer.current);
    timer.current = undefined;
  }

  return {
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        fired.current = false;
        clear();
        timer.current = setTimeout(() => {
          fired.current = true;
          onLongPress();
        }, delayMs);
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      // Right-click on desktop, and the long-press menu some mobile browsers raise.
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        clear();
        fired.current = true;
        onLongPress();
      },
    },
    consumeLongPress: () => {
      const wasLongPress = fired.current;
      fired.current = false;
      return wasLongPress;
    },
  };
}
