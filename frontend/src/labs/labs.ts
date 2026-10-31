// Amaliy laboratoriyalar ro'yxati (/labs).
// slug — manzil (/labs/<slug>), keyin o'zgartirmang.

export interface Lab {
  slug: string;
  title: string;
  summary: string;
  topics: string[];
}

export const labs: Lab[] = [
  {
    slug: "crypto",
    title: "Kriptografiya",
    summary:
      "2600 yillik sirlar: Sparta tayoqchasidan Enigma, RSA va AES'gacha. 16 ta shifr va algoritm: animatsiya, shifrlash/ochish asbobi va mashqlar bilan.",
    topics: ["Sezar", "Vijener", "Enigma", "RSA", "AES", "Diffie–Hellman"],
  },
];
