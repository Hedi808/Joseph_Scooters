export type ShippingRule = {
  governorate: string;
  category_slug: string | null;
  fee_millimes: number;
  enabled?: boolean;
};
export function shippingQuote(
  rules: ShippingRule[],
  region: string,
  categories: string[],
): number | null {
  if (!categories.length) return null;
  const fees = categories.map((c) => {
    const matches = rules.filter(
      (r) => r.enabled !== false && r.governorate === region,
    );
    const rule =
      matches.find((r) => r.category_slug === c) ||
      matches.find((r) => r.category_slug === null);
    return rule?.fee_millimes;
  });
  return fees.some((f) => f === undefined)
    ? null
    : Math.max(...(fees as number[]));
}
