import {redirect} from "@/navigation";
import {defaultLocale} from "@meble/i18n";

export default function RootRedirect() {
  redirect({ href: "/", locale: defaultLocale, forcePrefix: true });
}
