import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "./providers";
import AppHeader from "@/components/AppHeader";
import FocusOnRouteChange from "@/components/FocusOnRouteChange";
import SkipLink from "@/components/SkipLink";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Artefact | Task Manager",
  description: "A simple space to organize your tasks.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-dvh flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
        <SkipLink />
        <Suspense fallback={null}>
          <FocusOnRouteChange />
        </Suspense>
        <AppHeader />
        <TRPCProvider>
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-y-auto scroll-pt-16 px-4 py-8 sm:px-6 lg:px-8"
          >
            {children}
          </main>
        </TRPCProvider>
      </body>
    </html>
  );
}
