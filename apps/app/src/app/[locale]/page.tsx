import { useTranslations } from "next-intl";
import { Button } from "@meble/ui";
import { APP_NAME } from "@meble/constants";

export default function Home() {
  const t = useTranslations("home");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center text-foreground">
          {t("title", { appName: APP_NAME })}
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          {t("description")}
        </p>
        <div className="flex gap-4 justify-center">
          <Button>{t("getStarted")}</Button>
          <Button variant="outline">{t("learnMore")}</Button>
        </div>
      </div>
    </main>
  );
}
