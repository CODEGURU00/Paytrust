export function formatINR(value: number, options?: { decimals?: boolean }): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: options?.decimals ? 2 : 0,
    maximumFractionDigits: options?.decimals ? 2 : 0,
  }).format(value);
  return `₹${formatted}`;
}

/**
 * Format an amount in the currency it was actually recorded in.
 *
 * The workspace used formatINR everywhere, so a USD transaction was shown as
 * "₹2,400" - the wrong currency on the screen where the amount matters most.
 */
export function formatMoney(
  value: number,
  currency: string,
  options?: { decimals?: boolean }
): string {
  const code = (currency || 'USD').toUpperCase();

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: options?.decimals ? 2 : 0,
      maximumFractionDigits: options?.decimals ? 2 : 0,
    }).format(value);
  } catch {
    // An unknown currency code falls back to the code plus the amount.
    return `${code} ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: options?.decimals ? 2 : 0,
      maximumFractionDigits: options?.decimals ? 2 : 0,
    }).format(value)}`;
  }
}

export function formatCompactINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
  return `₹${value}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
