"use client";

import { ReactElement } from "react";
import { useLocale } from "next-intl";
import { track, AnalyticsEvent } from "@meble/analytics";
import { APP_URLS } from "@meble/constants";
import { getCurrentArticle } from "./ArticleTracker";

interface ArticleContentProps {
  body: string;
}

/**
 * Renders article body content with proper styling
 * Supports basic markdown-like syntax and custom CTA markers
 */
export function ArticleContent({ body }: ArticleContentProps) {
  const locale = useLocale() as "pl" | "en";

  // Parse and render content
  const renderContent = () => {
    const lines = body.split("\n");
    const elements: ReactElement[] = [];
    let currentList: string[] = [];
    let listType: "ul" | "ol" | null = null;
    let currentTable: { headers: string[]; rows: string[][] } | null = null;
    let inCodeBlock = false;
    let codeContent: string[] = [];

    const flushList = () => {
      if (currentList.length > 0 && listType) {
        const ListTag = listType;
        elements.push(
          <ListTag
            key={`list-${elements.length}`}
            className={`my-4 ${
              listType === "ul"
                ? "list-disc list-inside"
                : "list-decimal list-inside"
            } space-y-2 text-gray-700 dark:text-gray-300`}
          >
            {currentList.map((item, i) => (
              <li key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInlineStyles(item) }} />
            ))}
          </ListTag>
        );
        currentList = [];
        listType = null;
      }
    };

    const flushTable = () => {
      if (currentTable) {
        elements.push(
          <div key={`table-${elements.length}`} className="my-6 overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-indigo-50 dark:bg-trueGray-700">
                  {currentTable.headers.map((header, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-800 dark:text-white border-b border-gray-200 dark:border-trueGray-600"
                    >
                      {header.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentTable.rows.map((row, i) => (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0
                        ? "bg-white dark:bg-trueGray-800"
                        : "bg-gray-50 dark:bg-trueGray-750"
                    }
                  >
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-trueGray-700"
                        dangerouslySetInnerHTML={{ __html: formatInlineStyles(cell.trim()) }}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        currentTable = null;
      }
    };

    const formatInlineStyles = (text: string): string => {
      // Bold
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');
      // Inline code
      text = text.replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 bg-gray-100 dark:bg-trueGray-700 rounded text-sm font-mono text-indigo-600 dark:text-indigo-400">$1</code>');
      // Emojis for checkmarks and crosses
      text = text.replace(/✅/g, '<span class="text-green-500">✓</span>');
      text = text.replace(/❌/g, '<span class="text-red-500">✗</span>');
      // Stars for ratings
      text = text.replace(/⭐/g, '<span class="text-yellow-500">★</span>');
      return text;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Code blocks
      if (trimmedLine.startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${elements.length}`}
              className="my-6 p-4 bg-gray-900 dark:bg-trueGray-950 rounded-lg overflow-x-auto"
            >
              <code className="text-sm text-gray-100 font-mono">
                {codeContent.join("\n")}
              </code>
            </pre>
          );
          codeContent = [];
          inCodeBlock = false;
        } else {
          flushList();
          flushTable();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Empty lines
      if (!trimmedLine) {
        flushList();
        flushTable();
        continue;
      }

      // CTA markers
      if (trimmedLine.startsWith("[CTA:")) {
        flushList();
        flushTable();
        const ctaText = trimmedLine.match(/\[CTA:\s*(.+?)\]/)?.[1] || (locale === "pl" ? "Rozpocznij" : "Get started");
        const handleInlineCtaClick = () => {
          const article = getCurrentArticle();
          track(AnalyticsEvent.LANDING_ARTICLE_CTA_CLICKED, {
            article_slug: article?.slug || "unknown",
            cta_location: "inline",
          });
        };
        elements.push(
          <div key={`cta-${elements.length}`} className="my-8 text-center">
            <a
              href={`${APP_URLS.app}?ref=blog-${getCurrentArticle()?.slug || "article"}`}
              onClick={handleInlineCtaClick}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              {ctaText}
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        );
        continue;
      }

      // H2 headers
      if (trimmedLine.startsWith("## ")) {
        flushList();
        flushTable();
        elements.push(
          <h2
            key={`h2-${elements.length}`}
            className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 pb-2 border-b border-gray-200 dark:border-trueGray-700"
          >
            {trimmedLine.slice(3)}
          </h2>
        );
        continue;
      }

      // H3 headers
      if (trimmedLine.startsWith("### ")) {
        flushList();
        flushTable();
        elements.push(
          <h3
            key={`h3-${elements.length}`}
            className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-white mt-8 mb-4"
          >
            {trimmedLine.slice(4)}
          </h3>
        );
        continue;
      }

      // Blockquotes
      if (trimmedLine.startsWith("> ")) {
        flushList();
        flushTable();
        elements.push(
          <blockquote
            key={`quote-${elements.length}`}
            className="my-6 pl-6 border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 py-4 pr-4 rounded-r-lg"
          >
            <p
              className="text-gray-700 dark:text-gray-300 italic"
              dangerouslySetInnerHTML={{ __html: formatInlineStyles(trimmedLine.slice(2)) }}
            />
          </blockquote>
        );
        continue;
      }

      // Table rows
      if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
        flushList();
        const cells = trimmedLine.slice(1, -1).split("|");

        // Check if it's a separator row (|---|---|)
        if (cells.every((cell) => /^[\s-:]+$/.test(cell))) {
          continue;
        }

        if (!currentTable) {
          currentTable = { headers: cells, rows: [] };
        } else {
          currentTable.rows.push(cells);
        }
        continue;
      } else {
        flushTable();
      }

      // Unordered lists
      if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
        if (listType !== "ul") {
          flushList();
          listType = "ul";
        }
        currentList.push(trimmedLine.slice(2));
        continue;
      }

      // Ordered lists
      if (/^\d+\.\s/.test(trimmedLine)) {
        if (listType !== "ol") {
          flushList();
          listType = "ol";
        }
        currentList.push(trimmedLine.replace(/^\d+\.\s/, ""));
        continue;
      }

      // Regular paragraphs
      flushList();
      flushTable();
      elements.push(
        <p
          key={`p-${elements.length}`}
          className="my-4 text-gray-700 dark:text-gray-300 leading-relaxed text-lg"
          dangerouslySetInnerHTML={{ __html: formatInlineStyles(trimmedLine) }}
        />
      );
    }

    // Flush remaining content
    flushList();
    flushTable();

    return elements;
  };

  return (
    <div className="prose-custom max-w-none">
      {renderContent()}
    </div>
  );
}
