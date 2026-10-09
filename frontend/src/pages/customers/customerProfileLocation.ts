export interface ProfileRegionParts {
  province?: string | null;
  provinceLabel?: string | null;
  city?: string | null;
  cityLabel?: string | null;
  district?: string | null;
  districtLabel?: string | null;
}

export function formatProfileRegion(parts: ProfileRegionParts): string {
  return [
    parts.provinceLabel || parts.province,
    parts.cityLabel || parts.city,
    parts.districtLabel || parts.district,
  ].filter(Boolean).join('') || '-';
}
