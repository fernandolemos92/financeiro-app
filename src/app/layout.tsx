import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { TransactionModalProvider } from "@/contexts/transaction-modal-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Financeiro App - Controle financeiro simples",
  description: "Controle financeiro simples, sem complicação. Organize sua vida financeira com clareza.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} min-h-full antialiased bg-[#131313] text-[#E5E2E1]`}>
        <TooltipProvider>
          <TransactionModalProvider>
            {children}
          </TransactionModalProvider>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}