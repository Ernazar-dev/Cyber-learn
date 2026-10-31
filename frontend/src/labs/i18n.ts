// Laboratoriya matnlari RootY-team'dan ko'chirilgan va to'rt tilda yozilgan.
// Loyiha hozircha faqat o'zbekcha, shuning uchun sahifalar `LAB_LOCALE` ni uzatadi.
export const locales = ["uz", "kaa", "ru", "en"] as const;
export type Locale = (typeof locales)[number];

/** A value written once per language, e.g. a lesson title. */
export type Localized<T = string> = Record<Locale, T>;

export const LAB_LOCALE: Locale = "uz";
