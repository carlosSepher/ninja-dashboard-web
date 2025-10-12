import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const toMinorUnits = (amount: number): number => Math.round(amount * 100);

export const formatCurrency = (amountMinor: number, currency = "CLP"): string => {
  const normalizedCurrency = typeof currency === "string" ? currency.toUpperCase() : "CLP";
  const isIsoCurrency = /^[A-Z]{3}$/.test(normalizedCurrency);

  try {
    const options: Intl.NumberFormatOptions = {
      style: "currency",
      currency: normalizedCurrency,
    };
    if (normalizedCurrency === "CLP") {
      options.minimumFractionDigits = 0;
    }

    const formatter = new Intl.NumberFormat("es-CL", options);
    const { maximumFractionDigits } = formatter.resolvedOptions();
    const divisor = 10 ** (maximumFractionDigits ?? 2);

    return formatter.format(amountMinor / divisor);
  } catch (error) {
    const fallbackDivisor = normalizedCurrency === "CLP" ? 1 : 100;
    const fallbackValue = (amountMinor / fallbackDivisor).toFixed(2);

    if (!isIsoCurrency) {
      return `${fallbackValue} ${normalizedCurrency}`.trim();
    }

    console.warn("Failed to format currency", { currency: normalizedCurrency, error });
    return `${fallbackValue} ${normalizedCurrency}`.trim();
  }
};

export const formatPercentage = (value: number, fractionDigits = 1): string =>
  `${value.toFixed(fractionDigits)}%`;

export const formatDateTime = (value?: string | number | Date | null): string => {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch (error) {
    console.warn("Failed to format date", error);
    return "-";
  }
};

export const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "-";
  const totalSeconds = Math.floor(seconds);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || parts.length) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(" ");
};
