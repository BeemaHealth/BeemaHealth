export type ShippingAddressValue = {
  address: string;
  city: string;
  zip: string;
  county: string;
  verified: boolean;
};

export function formatShippingAddressLines(
  value: ShippingAddressValue,
): string[] {
  if (!value.address && !value.city && !value.zip) return [];
  const lines: string[] = [];
  if (value.address) lines.push(value.address);
  const cityZip = [value.city, value.zip].filter(Boolean).join(", ");
  if (cityZip) lines.push(cityZip);
  if (value.county) lines.push(`${value.county} County`);
  return lines;
}
