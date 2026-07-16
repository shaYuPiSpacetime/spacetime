export type ProfileTagItem = {
  code: string
  label: string
}

export type ProfileTagTone = {
  color: string
  background: string
}

const profileTagTones: ProfileTagTone[] = [
  { color: '#45A852', background: '#EAF7EC' },
  { color: '#318DEB', background: '#E8F3FF' },
  { color: '#F08A17', background: '#FFF2E4' },
  { color: '#9C3CB1', background: '#F5E9F8' },
  { color: '#5268C8', background: '#ECEFFD' },
  { color: '#F05D64', background: '#FDEBED' },
]

export function resolveProfileTagTone(item: ProfileTagItem) {
  return profileTagTones[stableTagHash(item.code) % profileTagTones.length]
}

function stableTagHash(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) >>> 0
  }
  return hash
}
