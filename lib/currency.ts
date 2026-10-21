const audFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

export function formatAUD(value: number | string | null | undefined) {
  return audFormatter.format(Number(value) || 0);
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency: string | null | undefined = "AUD",
) {
  const normalized = String(currency || "AUD").toUpperCase();
  if (normalized === "AUD") return formatAUD(value);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: normalized,
  }).format(Number(value) || 0);
}
