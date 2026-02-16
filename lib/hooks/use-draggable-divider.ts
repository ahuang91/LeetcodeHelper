import { useState, useCallback, useEffect } from "react";

interface UseDraggableDividerOptions {
  containerId: string;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function useDraggableDivider({
  containerId,
  initialWidth = 50,
  minWidth = 20,
  maxWidth = 80,
}: UseDraggableDividerOptions) {
  const [leftPaneWidth, setLeftPaneWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const container = document.getElementById(containerId);
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPaneWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)));
    },
    [isDragging, containerId, minWidth, maxWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return { leftPaneWidth, isDragging, handleMouseDown };
}
