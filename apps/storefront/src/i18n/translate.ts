import { uk } from './dictionaries/uk.ts';
import { assertPublishedLocale, type Locale, type PublishedLocale } from './locales.ts';

export type TranslationKey = keyof typeof uk;
export type Dictionary = { readonly [K in TranslationKey]: string };
type Placeholders<S extends string> = S extends `${string}{${infer P}}${infer Rest}`
  ? P | Placeholders<Rest> : never;
type ParametersFor<K extends TranslationKey> = Placeholders<(typeof uk)[K]>;
type Arguments<K extends TranslationKey> = [ParametersFor<K>] extends [never]
  ? [] : [values: { [P in ParametersFor<K>]: string | number }];
export type Translator = <K extends TranslationKey>(key: K, ...args: Arguments<K>) => string;

function placeholders(message: string): string[] {
  return [...new Set([...message.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]))].sort();
}

/** Also catches missing/blank keys and changed interpolation parameters in future dictionaries. */
export function validateDictionary(value: unknown): asserts value is Dictionary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid dictionary');
  const candidate = value as Record<string, unknown>;
  for (const key of Object.keys(uk) as TranslationKey[]) {
    const message = candidate[key];
    if (!Object.hasOwn(candidate, key) || typeof message !== 'string' || !message.trim()) {
      throw new Error(`Missing translation: ${key}`);
    }
    if (JSON.stringify(placeholders(message)) !== JSON.stringify(placeholders(uk[key]))) {
      throw new Error(`Translation parameters differ: ${key}`);
    }
  }
  for (const key of Object.keys(candidate)) {
    if (!Object.hasOwn(uk, key)) throw new Error(`Unknown translation: ${key}`);
  }
}

const dictionaries: Record<PublishedLocale, Dictionary> = { uk };
for (const dictionary of Object.values(dictionaries)) {
  validateDictionary(dictionary);
  Object.freeze(dictionary);
}

/** No browser detection, storage, cross-language fallback or draft imports. */
export function getDictionary(locale: Locale): Dictionary {
  assertPublishedLocale(locale);
  return dictionaries[locale];
}

/** Identical synchronous API in Server and Client Components; returns plain text, never HTML. */
export function getTranslator(locale: Locale): Translator {
  const dictionary = getDictionary(locale);
  return <K extends TranslationKey>(key: K, ...args: Arguments<K>): string => {
    if (!Object.hasOwn(dictionary, key)) throw new Error(`Missing translation: ${String(key)}`);
    const message = dictionary[key];
    const values = (args[0] ?? {}) as Record<string, string | number>;
    const expected = placeholders(message);
    if (Object.keys(values).some((name) => !expected.includes(name))) {
      throw new Error(`Unexpected translation parameter: ${key}`);
    }
    return message.replace(/\{([^{}]+)\}/g, (_, name: string) => {
      if (!Object.hasOwn(values, name) || !['string', 'number'].includes(typeof values[name])) {
        throw new Error(`Missing translation parameter: ${key}.${name}`);
      }
      return String(values[name]);
    });
  };
}
