import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
          width: "100%",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            position: "relative",
            overflow: "hidden",
            width: "100%",
          }}
        >
          {/* LOGO GLOBAL MARCA DE AGUA */}
          <img
            src="/logo.png"
            alt="logo"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(90vw, 2250px)",
              maxWidth: "2250px",
              height: "auto",
              opacity: 0.12,
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 0,
              filter: "grayscale(100%)",
            }}
          />

          {/* CONTENIDO */}
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
      </body>
    </html>
  );
}
