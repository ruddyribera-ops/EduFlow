import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'es', 'pt-BR'] as const;

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming locale is valid
  if (!locales.includes(locale as typeof locales[number])) {
    return {
      messages: (await import(`./messages/en.json`)).default,
    };
  }

  return {
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
