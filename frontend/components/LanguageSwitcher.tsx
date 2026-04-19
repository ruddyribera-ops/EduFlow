"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    // Remove current locale from pathname and add new one
    const pathWithoutLocale = pathname.slice(3); // Remove /:locale prefix
    router.push(`/${newLocale}${pathWithoutLocale}`);
  }

  return (
    <div className="flex gap-1">
      {["en", "es", "pt-BR"].map((lang) => (
        <button
          key={lang}
          onClick={() => switchLocale(lang)}
          className={`text-xs px-2 py-0.5 rounded transition-colors ${
            locale === lang
              ? "bg-slate-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {lang === "pt-BR" ? "PT" : lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
