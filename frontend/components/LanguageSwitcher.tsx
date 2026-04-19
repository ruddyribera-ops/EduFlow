"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    // Remove locale prefix (2-5 chars) from pathname before prepending new locale
    const pathWithoutLocale = pathname.replace(/^\/(en|es|pt-BR)/, '');
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
