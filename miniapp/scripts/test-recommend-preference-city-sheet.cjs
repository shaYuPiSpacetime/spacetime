const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const repoRoot = path.resolve(__dirname, '..', '..')

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

test('偏好设置城市筛选复用编辑资料现居地底部组件', () => {
  const preference = read('miniapp/src/pages/prd08/recommend/preference/index.tsx')
  const regionSheet = read('miniapp/src/pages/verification/components/LanhuPickerSheet.tsx')

  assert.match(
    preference,
    /import \{ LanhuRegionSheet \} from '@\/pages\/verification\/components\/LanhuPickerSheet'/
  )
  assert.match(preference, /data-role="recommend-city-sheet-trigger"/)
  assert.match(preference, /id="recommend-city-sheet-trigger"/)
  assert.match(preference, /onClick=\{openCitySheet\}/)
  assert.doesNotMatch(preference, /mode="multiSelector"/)

  assert.match(preference, /citySheetVisible \? \(/)
  assert.match(preference, /title="居住地偏好"/)
  assert.match(preference, /regions=\{cities\}/)
  assert.match(preference, /includeDistrict=\{false\}/)
  assert.match(preference, /loadDistricts=\{loadDistricts\}/)
  assert.match(preference, /该城市已添加/)
  assert.match(preference, /最多选择3个城市/)
  assert.match(
    preference,
    /targetCities: \[\.\.\.model\.targetCities, \{ code: city\.code, name: city\.name \}\]/
  )

  assert.match(regionSheet, />\s*中国\s*</)
  assert.match(regionSheet, />\s*海外地区国家\s*</)
  assert.match(regionSheet, /background: '#E3F1FE'/)
  assert.match(regionSheet, /<BottomPicker/)
})
