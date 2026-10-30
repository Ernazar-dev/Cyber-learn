export type Level = "Beginner" | "Intermediate" | "Advanced";

export function translateLevel(level: Level) {
  return {
    Beginner: "Boshlang'ich",
    Intermediate: "O'rta",
    Advanced: "Yuqori",
  }[level];
}

export function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function downloadModuleCertificate(
  moduleId: number,
  download: (path: string) => Promise<Blob>,
) {
  const blob = await download(`/api/modules/${moduleId}/certificate`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sertifikat-${moduleId}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
