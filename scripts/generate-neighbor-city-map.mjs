import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 只在更新基础地理数据时运行；线上直接读取随包发布的数据，不请求地图供应商。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = 'https://geo.datav.aliyun.com/areas_v3/bound/'
const readGeo = code => JSON.parse(execFileSync('curl', ['-fsSL', '--max-time', '30', `${base}${code}_full.json`], { maxBuffer: 30 * 1024 * 1024 }).toString())
const municipalities = new Set(['110000', '120000', '310000', '500000'])
const country = readGeo('100000')
const cities = new Map()
for (const province of country.features) {
  const code = String(province.properties.adcode)
  if (!/^\d{6}$/.test(code) || Number(code) >= 710000) continue
  const children = readGeo(code).features
  const features = municipalities.has(code) ? [{
    properties: province.properties,
    geometry: { type: 'MultiPolygon', coordinates: children.flatMap(feature =>
      feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates) },
  }] : children
  for (const feature of features) {
    const cityCode = municipalities.has(code) ? `${code.slice(0, 2)}0100` : String(feature.properties.adcode)
    if (!/^\d{6}$/.test(cityCode) || !feature.properties.name) continue
    cities.set(cityCode, feature)
  }
}

const edgeOwners = new Map()
for (const [code, feature] of cities) {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (let index = 1; index < ring.length; index++) {
        // 各省导出的同一边界有亚米级坐标舍入差异，约十米精度统一后再比较完整线段。
        const pointKey = point => point.slice(0, 2).map(value => Number(value).toFixed(4)).join(',')
        const ends = [pointKey(ring[index - 1]), pointKey(ring[index])].sort()
        if (ends[0] === ends[1]) continue
        const edge = ends.join('|')
        if (!edgeOwners.has(edge)) edgeOwners.set(edge, new Set())
        edgeOwners.get(edge).add(code)
      }
    }
  }
}
const neighbors = new Map([...cities.keys()].map(code => [code, new Set()]))
for (const owners of edgeOwners.values()) {
  for (const left of owners) for (const right of owners) if (left !== right) neighbors.get(left).add(right)
}
const distance = (left, right) => {
  const center = feature => feature.properties.centroid || feature.properties.center || [0, 0]
  const a = center(cities.get(left))
  const b = center(cities.get(right))
  const lon = (a[0] - b[0]) * Math.cos((a[1] + b[1]) * Math.PI / 360)
  return lon * lon + (a[1] - b[1]) ** 2
}
const result = {}
for (const code of [...cities.keys()].sort()) {
  const adjacent = [...neighbors.get(code)].sort((a, b) => distance(code, a) - distance(code, b))
  if (adjacent.length) result[code] = adjacent
}
// 直辖市历史“县”编码属于同一城市，兼容旧资料与新选择器。
for (const province of municipalities) {
  const prefix = province.slice(0, 2)
  result[`${prefix}0200`] = result[`${prefix}0100`] || []
}
console.log(`数据校验：${cities.size} 个地区，${Object.keys(result).length} 个邻接节点；上海邻接 ${JSON.stringify(result['310100'] || [])}`)
assert.ok(result['310100']?.includes('320500'), '上海邻接关系缺少苏州，禁止发布异常数据')
assert.ok(result['310100']?.includes('330400'), '上海邻接关系缺少嘉兴，禁止发布异常数据')
assert.ok(Object.keys(result).length >= 300, '全国城市覆盖不足，禁止发布异常数据')
const output = path.join(root, 'backend/src/main/resources/data/neighbor-cities.json')
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`)
console.log(`已生成 ${Object.keys(result).length} 个城市邻接表；上海：${result['310100'].map(code => cities.get(code).properties.name).join('、')}`)
