"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function FocusOnRouteChange() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (pathname === previousPathname.current) return;
    previousPathname.current = pathname;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById("main-content")?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
