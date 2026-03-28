export const DEFAULT_MODULE_COLOR = "#64748b";

export function sanitizeModuleColor(value: string) {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : DEFAULT_MODULE_COLOR;
}

export function getModuleTextColor(backgroundHex: string) {
  const hex = sanitizeModuleColor(backgroundHex).slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? "#111827" : "#ffffff";
}
