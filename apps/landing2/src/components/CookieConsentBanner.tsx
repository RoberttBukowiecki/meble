"use client";

import CookieConsent from "react-cookie-consent";
import { Link } from "@/i18n/navigation";

export function CookieConsentBanner() {
  return (
    <CookieConsent
      location="bottom"
      buttonText="Akceptuję"
      declineButtonText="Odrzuć opcjonalne"
      enableDeclineButton
      cookieName="cookie-consent"
      expires={365}
      style={{
        background: "rgba(17, 24, 39, 0.95)",
        backdropFilter: "blur(8px)",
        padding: "16px 24px",
        alignItems: "center",
        fontSize: "14px",
      }}
      buttonStyle={{
        background: "#4f46e5",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: "500",
        padding: "10px 20px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
      }}
      declineButtonStyle={{
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.3)",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: "500",
        padding: "10px 20px",
        borderRadius: "8px",
        cursor: "pointer",
        marginRight: "12px",
      }}
      contentStyle={{
        flex: "1 1 300px",
        margin: "0",
      }}
      buttonWrapperClasses="flex flex-wrap gap-2 mt-3 sm:mt-0"
      onAccept={() => {
        // Enable analytics when accepted
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("consent", "update", {
            analytics_storage: "granted",
          });
        }
      }}
      onDecline={() => {
        // Keep analytics disabled
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("consent", "update", {
            analytics_storage: "denied",
          });
        }
      }}
    >
      <span className="text-gray-200">
        Używamy plików cookies, aby zapewnić najlepsze doświadczenia na naszej stronie.{" "}
        <Link
          href="/cookies"
          className="text-indigo-400 hover:text-indigo-300 underline"
        >
          Dowiedz się więcej
        </Link>
      </span>
    </CookieConsent>
  );
}
