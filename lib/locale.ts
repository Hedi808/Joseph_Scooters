import "server-only";
import { cookies } from "next/headers";
import { dictionaries, type Locale } from "./i18n";
export async function i18n() {
  const value = (await cookies()).get("js-locale")?.value;
  const locale: Locale = value === "en" || value === "ar" ? value : "fr";
  return { locale, t: dictionaries[locale] };
}
