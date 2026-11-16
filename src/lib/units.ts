export const cmToIn = (cm: number) => cm / 2.54;
export const inToCm = (i: number) => i * 2.54;
export const kgToLb = (kg: number) => kg * 2.2046226218;
export const lbToKg = (lb: number) => lb / 2.2046226218;

export type HeightUnit = "cm" | "ftin" | "in" | "m";
export type WeightUnit = "kg" | "lb";
export type TimeUnit = "days" | "months";

export const DAYS_PER_MONTH = 30.44;

export function formatKg(kg: number, unit: WeightUnit) {
  return unit === "kg" ? `${kg.toFixed(1)} kg` : `${kgToLb(kg).toFixed(1)} lb`;
}

export function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
