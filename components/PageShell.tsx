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
        overflowX: "hidden",
        overflowY: "auto",
        width: "100%",
      }}
    >
      <img
        src="/logo.png"
        alt="logo"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(70vw, 1400px)",
          height: "auto",
          opacity: 0.08,
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          minWidth: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
