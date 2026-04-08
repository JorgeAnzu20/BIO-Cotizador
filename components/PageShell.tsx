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
        overflow: "hidden",
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
          width: "4250px",
          maxWidth: "70vw",
          opacity: 0.08,
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}