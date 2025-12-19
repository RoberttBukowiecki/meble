"use client";

import { Link } from "@/i18n/navigation";
import { Container } from "./Container";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { ArrowLeft } from "lucide-react";

interface LegalLayoutProps {
  children: React.ReactNode;
  title: string;
  lastUpdated: string;
}

export function LegalLayout({ children, title, lastUpdated }: LegalLayoutProps) {
  return (
    <>
      <header role="banner">
        <Navbar />
      </header>

      <main className="min-h-screen py-12">
        <Container>
          <div className="max-w-3xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mb-8 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Powrót do strony głównej</span>
            </Link>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              {title}
            </h1>

            <div className="prose prose-gray dark:prose-invert max-w-none">
              {children}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-12 text-sm text-gray-500 dark:text-gray-400">
              <p>Ostatnia aktualizacja: {lastUpdated}</p>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}
