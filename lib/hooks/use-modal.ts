import { useState, useEffect, useCallback } from "react";

export function useModal<T = boolean>(onClose?: () => void) {
  const [modalData, setModalData] = useState<T | null>(null);
  const isOpen = modalData !== null;

  const open = useCallback((data: T) => setModalData(data), []);
  const close = useCallback(() => {
    setModalData(null);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return { modalData, isOpen, open, close };
}
