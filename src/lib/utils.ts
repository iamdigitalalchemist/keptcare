import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(value: string | number | Date | null | undefined) {
  // Optional fields (DOB, last visit) can be empty; Intl throws on an invalid date.
  const date = value == null || value === "" ? null : new Date(value);
  return date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : "—";
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}
