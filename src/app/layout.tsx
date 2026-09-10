import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import PageviewTracker from "@/components/analytics/pageview-tracker";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://painelpncp.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    template: "%s | Painel PNCP",
    default: "Painel PNCP - Inteligência para licitações públicas",
  },
  description:
    "Central de inteligência para encontrar, analisar e acompanhar oportunidades de licitações públicas no PNCP.",
  openGraph: {
    title: "Painel PNCP - Inteligência para licitações públicas",
    description:
      "Monitore licitações, analise preços, acompanhe concorrentes e descubra as oportunidades mais relevantes para sua empresa.",
    type: "website",
    locale: "pt_BR",
    url: APP_URL,
    siteName: "Painel PNCP",
  },
  twitter: {
    card: "summary_large_image",
    title: "Painel PNCP - Inteligência para licitações públicas",
    description:
      "Central de inteligência para encontrar, analisar e acompanhar oportunidades públicas.",
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
        <PageviewTracker />
      </body>
    </html>
  );
}
