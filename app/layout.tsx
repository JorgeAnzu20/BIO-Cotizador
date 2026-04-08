import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Cotizaciones",
  description: "Sistema empresarial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          margin: 0,
          padding: 0,
          background: "#E5E7EB",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* 🔥 LOGO GLOBAL MARCA DE AGUA */}
          <img
            src="/logo.png"
            alt="logo"
            style={{
               position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "2250px",
          opacity: 0.12,
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 0,
              filter: "grayscale(100%)",
            }}
          />

          {/* CONTENIDO */}
          <div style={{ position: "relative", zIndex: 1 }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}