const certificationItems = [
  { code: 'AVATAR', key: 'avatar' as const, label: '头像' },
  { code: 'REAL_NAME', key: 'realName' as const, label: '实名' },
  { code: 'EDUCATION', key: 'education' as const, label: '学历' },
]

/** 公开资料只返回已通过项目，固定展示三项并逐项点亮。 */
export function buildPublicProfileCertifications(codes?: readonly string[] | null) {
  const approvedCodes = new Set(codes || [])
  return certificationItems.map(({ code, key, label }) => ({
    key,
    label,
    passed: approvedCodes.has(code),
  }))
}
