import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RADAR BOE PRO — Inteligencia Regulatoria",
  description: "Motor de inteligencia regulatoria sobre el BOE.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
