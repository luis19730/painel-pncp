import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://painelpncp.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    template: "%s | Painel PNCP",
    default: "Painel PNCP - Inteligencia para licitacoes publicas",
  },
  description:
    "Central de inteligencia para encontrar, analisar e acompanhar oportunidades de licitacoes publicas no PNCP.",
  openGraph: {
    title: "Painel PNCP - Inteligencia para licitacoes publicas",
    description:
      "Monitore licitacoes, analise precos, acompanhe concorrentes e descubra as oportunidades mais relevantes para sua empresa.",
    type: "website",
    locale: "pt_BR",
    url: APP_URL,
    siteName: "Painel PNCP",
  },
  twitter: {
    card: "summary_large_image",
    title: "Painel PNCP - Inteligencia para licitacoes publicas",
    description:
      "Central de inteligencia para encontrar, analisar e acompanhar oportunidades publicas.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${jakarta.variable} font-sans`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
