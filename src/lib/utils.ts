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

export function formatDate(value: string | number | Date) {
  return dateFormatter.format(new Date(value));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}
