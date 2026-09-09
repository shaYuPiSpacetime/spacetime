export const SOULMATE_PHONE_CONFIG_KEY = 'community.soulmate_source_phones';

export function formatSoulmatePhoneConfig(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join('\n');
  if (typeof value !== 'string') return '';

  const source = value.trim();
  if (!source) return '';
  try {
    const parsed = JSON.parse(source);
    return Array.isArray(parsed) ? parsed.map(String).join('\n') : value;
  } catch {
    return value;
  }
}

export function serializeSoulmatePhoneConfig(value: string) {
  const phones = value
    .split(/[\r\n,，]+/)
    .map((phone) => phone.trim())
    .filter(Boolean);
  return JSON.stringify(Array.from(new Set(phones)));
}

export function prepareCommunityConfigItemsForSave<T extends { configKey: string; configValue: unknown }>(items: T[]) {
  return items.map((item) => item.configKey === SOULMATE_PHONE_CONFIG_KEY
    ? { ...item, configValue: serializeSoulmatePhoneConfig(String(item.configValue ?? '')) }
    : item);
}
