import assert from 'node:assert/strict'
import test from 'node:test'

import { formatProfileRegion } from '../src/pages/customers/customerProfileLocation.ts'

test('管理后台用户详情优先使用家乡中文标签', () => {
  assert.equal(formatProfileRegion({
    province: '130000',
    provinceLabel: '河北省',
    city: '130100',
    cityLabel: '石家庄市',
  }), '河北省石家庄市')
})

test('中文标签缺失时回退地区编码，全部为空时显示占位符', () => {
  assert.equal(formatProfileRegion({ province: '130000', city: '130100' }), '130000130100')
  assert.equal(formatProfileRegion({}), '-')
})
