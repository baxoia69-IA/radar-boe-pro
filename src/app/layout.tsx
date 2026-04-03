import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexFiscalIA — Asesoría Fiscal con Inteligencia Regulatoria",
  description: "Asesor fiscal con monitorización automática del BOE. Alertas de impacto real para autónomos, empresas y gestorías que no pueden permitirse perder una norma crítica.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
