"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function Portal({ children }: { children: ReactNode }) {
  const elRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-portal", "true");
    el.style.position = "relative"; // create a stacking context for safety
    el.style.zIndex = "9999";
    document.body.appendChild(el);
    elRef.current = el as HTMLElement;
    setMounted(true);
    return () => {
      if (elRef.current && elRef.current.parentNode) {
        elRef.current.parentNode.removeChild(elRef.current);
      }
    };
  }, []);

  if (!mounted || !elRef.current) return null;
  return createPortal(children as any, elRef.current);
}


