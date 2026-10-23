import type { NotebookEntry } from "../types";
const KEY = "entelloq-reality-notebook-v1";
export function readNotebook(): NotebookEntry[] {
  try {
    const items: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(items)) return [];
    return items
      .filter(
        (v): v is NotebookEntry =>
          !!v &&
          typeof v === "object" &&
          typeof v.id === "string" &&
          typeof v.title === "string" &&
          !!v.config && typeof v.config === 'object' &&
          ['pendulum','bounce','projectile'].includes(v.config.kind) &&
          ['gravity','length','angle','restitution','initialHeight','speed'].every(key=>Number.isFinite(v.config[key])) &&
          v.config.gravity >= 1 && v.config.gravity <= 20 &&
          v.config.length >= .4 && v.config.length <= 2.4 &&
          v.config.angle >= 0 && v.config.angle <= 85 &&
          v.config.restitution >= 0 && v.config.restitution <= 1 &&
          v.config.initialHeight >= .08 && v.config.initialHeight <= 4 &&
          v.config.speed >= 0 && v.config.speed <= 8 &&
          typeof v.hypothesis === 'string' && typeof v.conclusion === 'string' &&
          (!v.observation || (typeof v.observation.name === 'string' && ['video','synthetic'].includes(v.observation.source) && Array.isArray(v.observation.samples) && v.observation.samples.length <= 5000 && v.observation.samples.every((s:Record<string,unknown>)=>s && ['t','x','y','vx','vy'].every(k=>typeof s[k] === 'number' && Number.isFinite(s[k]))))) &&
          typeof v.createdAt === "string" && Number.isFinite(Date.parse(v.createdAt)),
      )
      .slice(0, 40);
  } catch {
    return [];
  }
}
export function writeNotebook(entries: NotebookEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 40)));
}
export function downloadFile(
  name: string,
  content: string,
  type = "text/plain",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
