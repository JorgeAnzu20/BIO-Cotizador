"use client";

import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
};

const COLORS = {
  grayBg: "#E5E7EB",
  text: "#1F2937",
};

export default function PageShell({ children }: PageShellProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.grayBg,
        color: COLORS.text,
        fontFamily: "Inter, Arial, sans-serif",
        position: "relative",

        // 🔥 CLAVE PARA MOBILE
        overflowX: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,

          // 🔥 IMPORTANTE
          width: "100%",
          minWidth: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
