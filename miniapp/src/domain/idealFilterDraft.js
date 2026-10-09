/** 资料能力刷新不丢草稿；另一入口改变共享偏好版本后才同步城市与年龄。 */
export function mergeIdealFilterDraft(draft, meta) {
  const available = new Set((meta.conditions || []).filter(item => item.available).map(item => item.code))
  const sharedChanged = !draft || draft.preferenceVersion !== meta.preferenceVersion
  return {
    preferenceVersion: meta.preferenceVersion,
    targetCities: sharedChanged ? meta.targetCities || [] : draft.targetCities,
    minAge: sharedChanged ? meta.minAge : draft.minAge,
    maxAge: sharedChanged ? meta.maxAge : draft.maxAge,
    selectedConditionCodes: (draft ? draft.selectedConditionCodes : meta.lastConditionCodes || [])
      .filter(code => available.has(code)),
  }
}

/** 共享城市或年龄已经改变时，不能自动恢复另一套条件生成的历史结果。 */
export function isIdealSnapshotForPreference(record, preference) {
  if (record?.status !== 'active' || !record.summary) return false
  const codes = items => (items || []).map(item => item.code).sort().join(',')
  return record.summary.minAge === preference.minAge
    && record.summary.maxAge === preference.maxAge
    && codes(record.summary.targetCities) === codes(preference.targetCities)
}
