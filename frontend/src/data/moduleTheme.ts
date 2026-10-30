import { modules } from "@/data/curriculum";

/** Modul aksent ranglari (1-modul → 4-modul). Darslar, CTF va yo'nalishlar sahifalarida bir xil. */
export const MODULE_COLORS = ["#2563eb", "#0891b2", "#7c3aed", "#16a34a"];

export const moduleColor = (moduleId: number) => MODULE_COLORS[moduleId - 1] ?? "#64748b";

/** "2. Tarmoq xavfsizligi" ko'rinishidagi yorliq */
export const moduleLabel = (moduleId: number, fallback = "") =>
  modules[moduleId] ? `${moduleId}. ${modules[moduleId].title}` : fallback || `${moduleId}-modul`;
