import type { ProductDesign } from '../context/AppContext';

/**
 * Resolve a loose identifier (design code, design name, or a near-miss with
 * different dashes/spacing/casing) to a real catalog design.
 *
 * Mirrors the matching ladder used inside BuyerProductDetail so a banner slide
 * that stores e.g. "DKUS01" still opens the "DKUS-01" product.
 */
export function resolveDesignByCode(
  designs: ProductDesign[],
  raw?: string | null,
): ProductDesign | undefined {
  if (!raw) return undefined;
  const clean = raw.trim().toLowerCase();
  const norm = clean.replace(/[\s\-_]/g, '');
  if (!clean) return undefined;

  // 1. Exact match on code or name
  let match = designs.find((d) => d.design_code === raw || d.name === raw);
  if (match) return match;

  // 2. Case-insensitive / dash- & space-insensitive match on code or name
  match = designs.find((d) => {
    const code = d.design_code?.trim().toLowerCase() ?? '';
    const name = d.name?.trim().toLowerCase() ?? '';
    return (
      code === clean ||
      name === clean ||
      code.replace(/[\s\-_]/g, '') === norm ||
      name.replace(/[\s\-_]/g, '') === norm
    );
  });
  if (match) return match;

  // 3. Match on a child variant code / name
  match = designs.find((d) =>
    d.variants?.some((v) => {
      const vc = v.variant_code?.trim().toLowerCase() ?? '';
      const vn = v.variant_name?.trim().toLowerCase() ?? '';
      return vc === clean || vn === clean || vc.replace(/[\s\-_]/g, '') === norm;
    }),
  );
  return match;
}
