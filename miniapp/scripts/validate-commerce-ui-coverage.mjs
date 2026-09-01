import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataPath = path.join(rootDir, 'src/data/lanhuDemo.json')
const appConfigPath = path.join(rootDir, 'src/app.config.ts')
const acceptanceReportPath = path.resolve(rootDir, '../docs/验收报告/2026-07-07-商业化蓝湖还原-acceptance.md')
const trackedMissingSliceLedgerPath = path.resolve(rootDir, '../docs/验收报告/2026-07-08-商业化蓝湖缺失切图台账.md')
const missingSlicesPath = path.join(rootDir, '.lanhu-ref/lanhu-full-2026-07-07/missing-slices.md')

const REQUIRED_COMMERCE_DESIGNS = {
  membership: [
    { designName: '会员中心-全', route: '/pages/membership/index', variant: 'default' },
    { designName: '会员中心-会员未开通，支付按钮固定下方', route: '/pages/membership/index?variant=none', variant: 'none' },
    { designName: '会员中心-已开通', route: '/pages/membership/index?variant=active', variant: 'active' },
    { designName: '会员中心-已过期', route: '/pages/membership/index?variant=expired', variant: 'expired' },
    { designName: '会员中心-微信支付', route: '/pages/membership/index?payState=wechat-pay', variant: 'wechat-pay' },
    { designName: '会员中心-支付成功', route: '/pages/membership/index?payState=pay-success', variant: 'pay-success' },
    { designName: '会员中心-取消支付', route: '/pages/membership/index?payState=pay-cancel', variant: 'pay-cancel' },
    { designName: '会员中心-未支付出弹窗', route: '/pages/membership/index?payState=unpaid-sheet', variant: 'unpaid-sheet' },
    { designName: '会员记录', route: '/pages/membership/records', variant: 'default' },
    { designName: '会员记录-详情（已支付）', route: '/pages/membership/record-detail?status=paid', variant: 'paid' },
    { designName: '会员记录-详情（已退款）', route: '/pages/membership/record-detail?status=refunded', variant: 'refunded' },
  ],
  coins: [
    { designName: '千寻币', route: '/pages/coins/index', variant: 'default' },
    { designName: '千寻币-协议勾选', route: '/pages/coins/index?variant=checked', variant: 'checked' },
    { designName: '千寻币-点支付未勾选协议', route: '/pages/coins/index?variant=unchecked-error', variant: 'unchecked-error' },
    { designName: '千寻币-微信支付', route: '/pages/coins/index?payState=wechat-pay', variant: 'wechat-pay' },
    { designName: '千寻币-支付成功', route: '/pages/coins/index?payState=pay-success', variant: 'pay-success' },
    { designName: '千寻币-取消支付', route: '/pages/coins/index?payState=pay-cancel', variant: 'pay-cancel' },
    { designName: '千寻币-充值须知', route: '/pages/coins/index?variant=recharge-notice', variant: 'recharge-notice' },
    { designName: '千寻币明细', route: '/pages/coins/detail', variant: 'default' },
    { designName: '千寻币明细-暂无数据', route: '/pages/coins/detail?variant=empty', variant: 'empty' },
  ],
}

const LANHU_REF_DIR = path.join(rootDir, '.lanhu-ref/lanhu-full-2026-07-07/images')
const REQUIRED_REFERENCE_IMAGES = [
  '08-会员中心-全.png',
  '09-千寻币.png',
  '58-会员记录.png',
  '59-会员记录-详情（已退款）.png',
  '60-会员中心-已过期.png',
  '61-会员中心-连续包年.png',
  '62-会员中心-已开通.png',
  '63-会员中心-会员未开通，支付按钮固定下方.png',
  '64-会员中心-支付成功.png',
  '65-会员中心-微信支付.png',
  '66-千寻币明细.png',
  '67-千寻币明细-暂无数据.png',
  '68-千寻币-支付成功.png',
  '69-千寻币-取消支付.png',
  '70-千寻币-协议勾选.png',
  '71-千寻币-微信支付.png',
  '72-千寻币-充值须知.png',
  '75-会员中心-取消支付.png',
  '76-会员中心-未支付出弹窗.png',
  '77-会员记录-详情（已支付）.png',
  '78-订阅管理.png',
  '79-千寻币-点支付未勾选协议.png',
]

const COMMERCIAL_PAGE_FILES = [
  'src/pages/coins/index.tsx',
  'src/pages/coins/detail.tsx',
  'src/pages/membership/index.tsx',
  'src/pages/membership/records.tsx',
  'src/pages/membership/record-detail.tsx',
]

const REQUIRED_MEMBERSHIP_REFERENCE_BY_DESIGN = {
  '会员中心-全': '08-会员中心-全.png',
  '会员中心-已过期': '60-会员中心-已过期.png',
  '会员中心-连续包年': '61-会员中心-连续包年.png',
  '会员中心-已开通': '62-会员中心-已开通.png',
  '会员中心-会员未开通，支付按钮固定下方': '63-会员中心-会员未开通，支付按钮固定下方.png',
  '会员中心-支付成功': '64-会员中心-支付成功.png',
  '会员中心-微信支付': '65-会员中心-微信支付.png',
  '会员中心-取消支付': '75-会员中心-取消支付.png',
  '会员中心-未支付出弹窗': '76-会员中心-未支付出弹窗.png',
}

const REQUIRED_MEMBER_BENEFIT_ASSETS = [
  'src/assets/lanhu/pages/member-benefits/member-slice-match.png',
  'src/assets/lanhu/pages/member-benefits/member-slice-eye-open.png',
  'src/assets/lanhu/pages/member-benefits/member-slice-greeting-a.png',
  'src/assets/lanhu/pages/member-benefits/member-slice-recommend.png',
  'src/assets/lanhu/pages/member-benefits/member-slice-filter.png',
  'src/assets/lanhu/pages/member-benefits/member-slice-exposure.png',
  'src/assets/lanhu/pages/member-benefits/member-slice-stealth.png',
  'src/assets/lanhu/pages/member-benefits/member-slice-greeting-b.png',
  'src/assets/lanhu/pages/member-benefits/member-slice-my-2.png',
  'src/assets/lanhu/pages/member-benefits/member-slice-group-5-a.png',
  'src/assets/lanhu/pages/member-benefits/member-slice-group-5-b.png',
]

function readRgbPng(imageName) {
  const buffer = fs.readFileSync(path.join(LANHU_REF_DIR, imageName))
  const pngSignature = '89504e470d0a1a0a'
  assert.equal(buffer.subarray(0, 8).toString('hex'), pngSignature, `${imageName} 必须是 PNG 图片`)

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idatChunks = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    const chunk = buffer.subarray(offset + 8, offset + 8 + length)
    offset += 12 + length

    if (type === 'IHDR') {
      width = chunk.readUInt32BE(0)
      height = chunk.readUInt32BE(4)
      bitDepth = chunk[8]
      colorType = chunk[9]
      interlace = chunk[12]
    } else if (type === 'IDAT') {
      idatChunks.push(chunk)
    } else if (type === 'IEND') {
      break
    }
  }

  assert.equal(bitDepth, 8, `${imageName} 参考图必须是 8-bit PNG`)
  assert.equal(colorType, 2, `${imageName} 参考图必须是 RGB PNG`)
  assert.equal(interlace, 0, `${imageName} 参考图必须是非交错 PNG`)

  const inflated = zlib.inflateSync(Buffer.concat(idatChunks))
  const bytesPerPixel = 3
  const rowBytes = width * bytesPerPixel
  const pixels = Buffer.alloc(width * height * bytesPerPixel)

  let sourceOffset = 0
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset]
    sourceOffset += 1
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = inflated[sourceOffset + x]
      const left = x >= bytesPerPixel ? pixels[y * rowBytes + x - bytesPerPixel] : 0
      const up = y > 0 ? pixels[(y - 1) * rowBytes + x] : 0
      const upLeft = y > 0 && x >= bytesPerPixel ? pixels[(y - 1) * rowBytes + x - bytesPerPixel] : 0
      let value = raw

      if (filter === 1) {
        value += left
      } else if (filter === 2) {
        value += up
      } else if (filter === 3) {
        value += Math.floor((left + up) / 2)
      } else if (filter === 4) {
        const p = left + up - upLeft
        const pa = Math.abs(p - left)
        const pb = Math.abs(p - up)
        const pc = Math.abs(p - upLeft)
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
      } else {
        assert.equal(filter, 0, `${imageName} 出现未支持的 PNG filter: ${filter}`)
      }

      pixels[y * rowBytes + x] = value & 0xff
    }
    sourceOffset += rowBytes
  }

  return { width, height, pixels, rowBytes }
}

function findWideBands(image, predicate, minPixelsPerRow, minBandHeight) {
  const bands = []
  let current = null

  for (let y = 0; y < image.height; y += 1) {
    let count = 0
    let rowLeft = image.width
    let rowRight = -1
    const rowOffset = y * image.rowBytes

    for (let x = 0; x < image.width; x += 1) {
      const offset = rowOffset + x * 3
      const r = image.pixels[offset]
      const g = image.pixels[offset + 1]
      const b = image.pixels[offset + 2]
      if (predicate(r, g, b)) {
        count += 1
        rowLeft = Math.min(rowLeft, x)
        rowRight = Math.max(rowRight, x)
      }
    }

    if (count >= minPixelsPerRow) {
      if (!current) {
        current = { x1: rowLeft, y1: y, x2: rowRight, y2: y }
      } else {
        current.x1 = Math.min(current.x1, rowLeft)
        current.x2 = Math.max(current.x2, rowRight)
        current.y2 = y
      }
    } else if (current) {
      if (current.y2 - current.y1 + 1 >= minBandHeight) bands.push(current)
      current = null
    }
  }

  if (current && current.y2 - current.y1 + 1 >= minBandHeight) bands.push(current)
  return bands
}

function findConnectedBoxes(image, predicate, minPixels) {
  const total = image.width * image.height
  const matched = new Uint8Array(total)
  const visited = new Uint8Array(total)

  for (let y = 0; y < image.height; y += 1) {
    const rowOffset = y * image.rowBytes
    for (let x = 0; x < image.width; x += 1) {
      const offset = rowOffset + x * 3
      if (predicate(image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2])) {
        matched[y * image.width + x] = 1
      }
    }
  }

  const boxes = []
  const stack = new Int32Array(total)

  for (let start = 0; start < total; start += 1) {
    if (!matched[start] || visited[start]) continue

    let stackSize = 0
    stack[stackSize] = start
    stackSize += 1
    visited[start] = 1

    let count = 0
    let x1 = image.width
    let y1 = image.height
    let x2 = -1
    let y2 = -1

    while (stackSize > 0) {
      stackSize -= 1
      const index = stack[stackSize]
      const x = index % image.width
      const y = Math.floor(index / image.width)
      count += 1
      x1 = Math.min(x1, x)
      y1 = Math.min(y1, y)
      x2 = Math.max(x2, x)
      y2 = Math.max(y2, y)

      for (const next of [index - 1, index + 1, index - image.width, index + image.width]) {
        if (next < 0 || next >= total || visited[next] || !matched[next]) continue
        if (next === index - 1 && x === 0) continue
        if (next === index + 1 && x === image.width - 1) continue
        visited[next] = 1
        stack[stackSize] = next
        stackSize += 1
      }
    }

    if (count >= minPixels) boxes.push({ x1, y1, x2, y2, count })
  }

  return boxes.sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1)
}

function toRpxBox(band) {
  return {
    left: band.x1 / 2,
    top: band.y1 / 2,
    width: (band.x2 - band.x1 + 1) / 2,
    height: (band.y2 - band.y1 + 1) / 2,
  }
}

function findUnionBox(image, predicate) {
  let x1 = image.width
  let y1 = image.height
  let x2 = -1
  let y2 = -1
  let count = 0

  for (let y = 0; y < image.height; y += 1) {
    const rowOffset = y * image.rowBytes
    for (let x = 0; x < image.width; x += 1) {
      const offset = rowOffset + x * 3
      if (predicate(image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2], x / 2, y / 2)) {
        count += 1
        x1 = Math.min(x1, x)
        y1 = Math.min(y1, y)
        x2 = Math.max(x2, x)
        y2 = Math.max(y2, y)
      }
    }
  }

  assert.ok(count > 0, '必须能在参考图中采样到指定颜色区域')
  return toRpxBox({ x1, y1, x2, y2 })
}

function assertReferenceBboxEvidence() {
  const darkCardPredicate = (r, g, b) => r >= 28 && r <= 42 && g >= 26 && g <= 40 && b >= 25 && b <= 40
  const membershipDarkPredicate = (r, g, b) => r >= 32 && r <= 47 && g >= 30 && g <= 45 && b >= 28 && b <= 45
  const whiteSheetPredicate = (r, g, b) => r >= 245 && g >= 245 && b >= 245
  const coinBluePredicate = (r, g, b) => r >= 25 && r <= 120 && g >= 80 && g <= 190 && b >= 150 && b <= 255
  const toastGreyPredicate = (r, g, b) => r >= 165 && r <= 178 && g >= 165 && g <= 178 && b >= 165 && b <= 178
  const membershipToastPredicate = (r, g, b) => Math.abs(r - g) < 3 && Math.abs(g - b) < 3 && r >= 75 && r <= 135
  const coinDetailSeparatorPredicate = (r, g, b) => r >= 214 && r <= 222 && g >= 214 && g <= 222 && b >= 214 && b <= 222
  const subscriptionRedGuidePredicate = (r, g, b) => r > 200 && g < 95 && b < 95
  const membershipAvatarGoldPredicate = (r, g, b, x, y) => (
    x > 35
    && x < 160
    && y > 220
    && y < 350
    && r > 150
    && g > 115
    && g < 210
    && b < 130
    && r > g
    && g > b
  )

  const membershipHeroImages = [
    '08-会员中心-全.png',
    '60-会员中心-已过期.png',
    '61-会员中心-连续包年.png',
    '62-会员中心-已开通.png',
    '63-会员中心-会员未开通，支付按钮固定下方.png',
  ]
  for (const imageName of membershipHeroImages) {
    const boxes = findConnectedBoxes(readRgbPng(imageName), membershipDarkPredicate, 300000).map(toRpxBox)
    assert.deepEqual(
      boxes[0],
      { left: 25, top: 182, width: 700, height: 268 },
      `${imageName} 的会员卡 bbox 必须固定为 25/182/700*268`,
    )
  }
  const expectedMembershipAvatarBoxes = {
    '60-会员中心-已过期.png': { left: 52, top: 241, width: 92, height: 92 },
    '61-会员中心-连续包年.png': { left: 52, top: 241, width: 92, height: 92 },
    '62-会员中心-已开通.png': { left: 52, top: 241, width: 92, height: 92 },
    '63-会员中心-会员未开通，支付按钮固定下方.png': { left: 51, top: 241, width: 92, height: 92 },
    '78-订阅管理.png': { left: 52, top: 241, width: 92, height: 92 },
  }
  for (const [imageName, expectedAvatarBox] of Object.entries(expectedMembershipAvatarBoxes)) {
    const avatarBox = findUnionBox(readRgbPng(imageName), membershipAvatarGoldPredicate)
    assert.deepEqual(
      avatarBox,
      expectedAvatarBox,
      `${imageName} 的头像金边 bbox 必须与会员卡源码头像锚点一致`,
    )
  }

  const membershipHomeBoxes = findConnectedBoxes(readRgbPng('08-会员中心-全.png'), membershipDarkPredicate, 300000).map(toRpxBox)
  assert.deepEqual(
    membershipHomeBoxes.filter((box) => box.left === 25 && box.width === 700 && box.height === 168).slice(0, 2),
    [
      { left: 25, top: 856, width: 700, height: 168 },
      { left: 25, top: 1044, width: 700, height: 168 },
    ],
    '08-会员中心-全.png 的前两张权益卡 bbox 必须与源码锁定尺寸一致',
  )

  const membershipPackageImages = [
    '08-会员中心-全.png',
    '60-会员中心-已过期.png',
    '61-会员中心-连续包年.png',
    '62-会员中心-已开通.png',
    '63-会员中心-会员未开通，支付按钮固定下方.png',
  ]
  const expectedMembershipPlanBoxes = [
    { left: 29, top: 508.5, width: 210, height: 239.5 },
    { left: 253, top: 504, width: 218, height: 248 },
    { left: 481, top: 504, width: 218, height: 248 },
  ]
  for (const imageName of membershipPackageImages) {
    const packageBoxes = findConnectedBoxes(readRgbPng(imageName), membershipDarkPredicate, 50000)
      .map(toRpxBox)
      .filter((box) => box.top >= 500 && box.top <= 510)
      .sort((a, b) => a.left - b.left)
    assert.deepEqual(
      packageBoxes,
      expectedMembershipPlanBoxes,
      `${imageName} 的套餐轨道前三张卡片 bbox 必须与源码 PlanRail 节奏一致`,
    )
  }

  const membershipBottomBands = findConnectedBoxes(readRgbPng('63-会员中心-会员未开通，支付按钮固定下方.png'), whiteSheetPredicate, 300000).map(toRpxBox)
  assert.deepEqual(
    membershipBottomBands[0],
    { left: 1, top: 1387, width: 748, height: 236 },
    '63-会员中心-会员未开通 固定底栏白色 bbox 必须与源码 PayBar 高度一致',
  )
  const membershipBottomBandImages = {
    '60-会员中心-已过期.png': { left: 1, top: 1387, width: 748, height: 236 },
    '61-会员中心-连续包年.png': { left: 1, top: 1361, width: 748, height: 262 },
    '62-会员中心-已开通.png': { left: 1, top: 1387, width: 748, height: 236 },
  }
  for (const [imageName, expectedBand] of Object.entries(membershipBottomBandImages)) {
    const bottomBands = findConnectedBoxes(readRgbPng(imageName), whiteSheetPredicate, 300000).map(toRpxBox)
    assert.deepEqual(
      bottomBands[0],
      expectedBand,
      `${imageName} 的固定底栏白色 bbox 必须按状态锁定`,
    )
  }

  const subscriptionBoxes = findConnectedBoxes(readRgbPng('78-订阅管理.png'), membershipDarkPredicate, 200000).map(toRpxBox)
  assert.deepEqual(
    subscriptionBoxes.filter((box) => box.left === 25 && box.width === 700).slice(0, 6),
    [
      { left: 25, top: 182, width: 700, height: 268 },
      { left: 25, top: 570, width: 700, height: 98 },
      { left: 25, top: 678, width: 700, height: 98 },
      { left: 25, top: 786, width: 700, height: 98 },
      { left: 25, top: 1003, width: 700, height: 1007 },
      { left: 25, top: 2053, width: 700, height: 98 },
    ],
    '78-订阅管理.png 的首屏卡片、扣费说明行、取消指引和底部按钮 bbox 必须与源码锁定尺寸一致',
  )
  const subscriptionImage = readRgbPng('78-订阅管理.png')
  const subscriptionStep1ScreenshotBox = findUnionBox(
    subscriptionImage,
    (r, g, b, x, y) => x > 35 && x < 410 && y > 1040 && y < 1380 && r > 235 && g > 235 && b > 235,
  )
  assert.deepEqual(
    subscriptionStep1ScreenshotBox,
    { left: 51, top: 1136, width: 340.5, height: 230 },
    '78-订阅管理.png 的 STEP1 内嵌微信搜索白底图 bbox 必须与 SearchPlaceholder 尺寸一致',
  )
  const subscriptionStep2ScreenshotBox = findUnionBox(
    subscriptionImage,
    (r, g, b, x, y) => x > 35 && x < 410 && y > 1480 && y < 1900 && r > 235 && g > 235 && b > 235,
  )
  assert.deepEqual(
    subscriptionStep2ScreenshotBox,
    { left: 51, top: 1496, width: 341.5, height: 390 },
    '78-订阅管理.png 的 STEP2 内嵌自动续费白底图 bbox 必须与 RenewPlaceholder 尺寸一致',
  )
  const subscriptionRedGuideBoxes = findConnectedBoxes(subscriptionImage, subscriptionRedGuidePredicate, 20)
    .map(toRpxBox)
    .filter((box) => box.top > 1200 && box.top < 1820)
  assert.deepEqual(
    subscriptionRedGuideBoxes,
    [
      { left: 346, top: 1246, width: 17, height: 34.5 },
      { left: 318.5, top: 1294.5, width: 65.5, height: 43 },
      { left: 305.5, top: 1657, width: 44.5, height: 41.5 },
      { left: 73.5, top: 1707.5, width: 313.5, height: 95.5 },
    ],
    '78-订阅管理.png 的 STEP1/STEP2 红色箭头和红框 bbox 必须作为结构化占位基线锁定',
  )

  const recordsBands = findConnectedBoxes(readRgbPng('58-会员记录.png'), darkCardPredicate, 300000).map(toRpxBox)
  assert.deepEqual(recordsBands.slice(0, 2), [
    { left: 25, top: 182, width: 700, height: 188 },
    { left: 25, top: 390, width: 700, height: 188 },
  ], '58-会员记录.png 的两张列表卡片 bbox 必须与源码锁定尺寸一致')
  const memberRecordImage = readRgbPng('58-会员记录.png')
  const memberRecordDiamondBox = findUnionBox(
    memberRecordImage,
    (r, g, b, x, y) => x > 35 && x < 115 && y > 210 && y < 290 && r > 200 && g > 150 && b < 150,
  )
  assert.deepEqual(
    memberRecordDiamondBox,
    { left: 51, top: 229, width: 48, height: 38 },
    '58-会员记录.png 的首条会员菱形图标金色 bbox 必须与源码 MemberRecordDiamond 占位锚点一致',
  )
  const refundStampBox = findUnionBox(
    memberRecordImage,
    (r, g, b, x, y) => (
      x > 320
      && x < 510
      && y > 410
      && y < 555
      && Math.abs(r - g) < 10
      && Math.abs(g - b) < 10
      && r > 130
      && r < 190
    ),
  )
  assert.deepEqual(
    refundStampBox,
    { left: 320.5, top: 440.5, width: 189.5, height: 85.5 },
    '58-会员记录.png 的退款章灰色主体 bbox 必须与源码 RefundStamp 占位锚点一致',
  )

  for (const imageName of ['77-会员记录-详情（已支付）.png', '59-会员记录-详情（已退款）.png']) {
    const detailBands = findConnectedBoxes(readRgbPng(imageName), darkCardPredicate, 300000).map(toRpxBox)
    assert.deepEqual(detailBands.slice(0, 2), [
      { left: 25, top: 184, width: 700, height: 168 },
      { left: 25, top: 372, width: 700, height: 528 },
    ], `${imageName} 的详情摘要卡和信息卡 bbox 必须与源码锁定尺寸一致`)
  }

  const coinSheetBands = findWideBands(readRgbPng('79-千寻币-点支付未勾选协议.png'), whiteSheetPredicate, 1200, 80).map(toRpxBox)
  assert.deepEqual(coinSheetBands[0], { left: 0, top: 1236, width: 750, height: 108.5 }, '79 底部协议弹层圆角顶部白色 band 必须从 top:1236rpx 开始')

  const coinHomeBlueBands = findConnectedBoxes(readRgbPng('09-千寻币.png'), coinBluePredicate, 200000).map(toRpxBox)
  assert.deepEqual(
    coinHomeBlueBands,
    [
      { left: 25, top: 182, width: 700, height: 188 },
      { left: 44, top: 1440, width: 664, height: 98 },
    ],
    '09-千寻币.png 的余额卡和底部支付按钮 bbox 必须与源码锁定尺寸一致',
  )

  const coinDetailSeparators = findWideBands(readRgbPng('66-千寻币明细.png'), coinDetailSeparatorPredicate, 1200, 1).map(toRpxBox)
  assert.deepEqual(
    coinDetailSeparators,
    [
      { left: 24.5, top: 411, width: 701, height: 1 },
      { left: 24.5, top: 559, width: 701, height: 1 },
      { left: 24.5, top: 703, width: 701, height: 1 },
      { left: 24.5, top: 851, width: 701, height: 1 },
      { left: 24.5, top: 995, width: 701, height: 1 },
    ],
    '66-千寻币明细.png 的列表分割线 band 必须锁定首屏行高节奏',
  )

  const coinEmptyImage = readRgbPng('67-千寻币明细-暂无数据.png')
  const coinEmptyIllustrationBox = findUnionBox(
    coinEmptyImage,
    (r, g, b, x, y) => (
      x > 180
      && x < 560
      && y > 500
      && y < 780
      && Math.abs(r - g) < 8
      && Math.abs(g - b) < 8
      && r >= 190
      && r <= 230
    ),
  )
  assert.deepEqual(
    coinEmptyIllustrationBox,
    { left: 226, top: 526, width: 298, height: 254 },
    '67-千寻币明细-暂无数据.png 的空态浅灰插画 bbox 必须与 EmptyState 占位锚点一致',
  )
  const coinEmptyTextBox = findUnionBox(
    coinEmptyImage,
    (r, g, b, x, y) => (
      x > 250
      && x < 500
      && y > 770
      && y < 840
      && Math.abs(r - g) < 8
      && Math.abs(g - b) < 8
      && r >= 130
      && r <= 175
    ),
  )
  assert.deepEqual(
    coinEmptyTextBox,
    { left: 321, top: 779, width: 108, height: 25.5 },
    '67-千寻币明细-暂无数据.png 的暂无记录文字 bbox 必须与 EmptyState 文字锚点一致',
  )
  const coinEmptyButton = findConnectedBoxes(coinEmptyImage, coinBluePredicate, 200000).map(toRpxBox)
  assert.deepEqual(
    coinEmptyButton[0],
    { left: 44, top: 864, width: 664, height: 98 },
    '67-千寻币明细-暂无数据.png 的去充值按钮 bbox 必须与空态源码锁定尺寸一致',
  )

  for (const imageName of ['68-千寻币-支付成功.png', '69-千寻币-取消支付.png']) {
    const toastBands = findConnectedBoxes(readRgbPng(imageName), toastGreyPredicate, 20000).map(toRpxBox)
    assert.deepEqual(
      toastBands[0],
      { left: 231, top: 393, width: 288, height: 98 },
      `${imageName} 的灰色支付结果提示 bbox 必须与源码 PayResultModal 一致`,
    )
  }

  const coinCheckedBlueBands = findConnectedBoxes(readRgbPng('70-千寻币-协议勾选.png'), coinBluePredicate, 200000).map(toRpxBox)
  assert.deepEqual(
    coinCheckedBlueBands.filter((box) => box.left === 44 && box.width === 664),
    [{ left: 44, top: 1440, width: 664, height: 98 }],
    '70-千寻币-协议勾选.png 的底部支付按钮 bbox 必须与源码 PayBar 一致',
  )

  const coinNoticeModalBands = findConnectedBoxes(readRgbPng('72-千寻币-充值须知.png'), whiteSheetPredicate, 300000).map(toRpxBox)
  assert.deepEqual(
    coinNoticeModalBands[0],
    { left: 65, top: 386, width: 620, height: 538 },
    '72-千寻币-充值须知.png 的白色弹窗 bbox 必须与源码 RechargeNoticeModal 一致',
  )
  const coinNoticeBlueBands = findConnectedBoxes(readRgbPng('72-千寻币-充值须知.png'), coinBluePredicate, 200000).map(toRpxBox)
  assert.deepEqual(
    coinNoticeBlueBands.filter((box) => box.left === 44 && box.width === 664),
    [{ left: 44, top: 1440, width: 664, height: 98 }],
    '72-千寻币-充值须知.png 的底部支付按钮 bbox 必须保持与主态底栏一致',
  )

  for (const imageName of ['64-会员中心-支付成功.png', '75-会员中心-取消支付.png']) {
    const membershipToastBands = findConnectedBoxes(readRgbPng(imageName), membershipToastPredicate, 20000).map(toRpxBox)
    assert.deepEqual(
      membershipToastBands[0],
      { left: 231, top: 393, width: 288, height: 98 },
      `${imageName} 的支付结果提示 bbox 必须与源码 PayResultModal 一致`,
    )
  }

  const unpaidSheetBands = findConnectedBoxes(readRgbPng('76-会员中心-未支付出弹窗.png'), whiteSheetPredicate, 300000).map(toRpxBox)
  assert.deepEqual(
    unpaidSheetBands[0],
    { left: 0, top: 1236, width: 750, height: 388 },
    '76-会员中心-未支付出弹窗.png 的白色底部弹层 bbox 必须与源码 UnpaidBottomSheet 一致',
  )
  const unpaidButtonBands = findConnectedBoxes(readRgbPng('76-会员中心-未支付出弹窗.png'), darkCardPredicate, 200000).map(toRpxBox)
  assert.deepEqual(
    unpaidButtonBands.filter((box) => box.left === 44 && box.width === 664),
    [{ left: 44, top: 1443, width: 664, height: 98 }],
    '76-会员中心-未支付出弹窗.png 的确认开通按钮 bbox 必须与源码 UnpaidBottomSheet 一致',
  )

  const nativeWechatPanelTopBands = {
    '65-会员中心-微信支付.png': { left: 0, top: 578, width: 749.5, height: 110.5 },
    '71-千寻币-微信支付.png': { left: 0, top: 578, width: 750, height: 111 },
  }
  for (const [imageName, expectedBand] of Object.entries(nativeWechatPanelTopBands)) {
    const nativePanelBands = findWideBands(readRgbPng(imageName), whiteSheetPredicate, 1200, 20).map(toRpxBox)
    assert.deepEqual(
      nativePanelBands[0],
      expectedBand,
      `${imageName} 的微信原生支付面板白色顶部 band 必须作为原生能力参考边界登记`,
    )
  }

  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  for (const note of [
    '58-会员记录.png bbox 采样：列表卡片为 `left:25rpx/top:182rpx/700rpx*188rpx`，第二张 `top:390rpx`',
    '58-会员记录.png 图标 bbox 采样：首条会员菱形金色主体约 `left:51rpx/top:229rpx/48rpx*38rpx`；退款章灰色主体约 `left:320.5rpx/top:440.5rpx/189.5rpx*85.5rpx`',
    '77/59 会员详情 bbox 采样：摘要卡 `left:25rpx/top:184rpx/700rpx*168rpx`，信息卡 `left:25rpx/top:372rpx/700rpx*528rpx`',
    '79 千寻币协议弹层 bbox 采样：白色底层圆角顶部 band 从 `top:1236rpx` 开始，高约 `108.5rpx`',
    '09-千寻币.png bbox 采样：余额卡为 `left:25rpx/top:182rpx/700rpx*188rpx`，底部支付按钮为 `left:44rpx/top:1440rpx/664rpx*98rpx`',
    '66-千寻币明细.png bbox 采样：分割线为 `top:411/559/703/851/995rpx`，横向为 `left:24.5rpx/width:701rpx`',
    '67-千寻币明细-暂无数据.png 空态插画 bbox 采样：浅灰插画整体为 `left:226rpx/top:526rpx/298rpx*254rpx`；暂无记录文字为 `left:321rpx/top:779rpx/108rpx*25.5rpx`',
    '67-千寻币明细-暂无数据.png bbox 采样：去充值按钮为 `left:44rpx/top:864rpx/664rpx*98rpx`',
    '68/69 千寻币支付结果 bbox 采样：灰色提示为 `left:231rpx/top:393rpx/288rpx*98rpx`',
    '70-千寻币-协议勾选.png bbox 采样：底部支付按钮为 `left:44rpx/top:1440rpx/664rpx*98rpx`',
    '2026-08-05 充值须知刷新稿 bbox 采样：白色弹窗为 `left:65rpx/top:386rpx/620rpx*570rpx`，正文为 `26/44rpx`，底部支付按钮保持 `left:44rpx/top:1440rpx/664rpx*98rpx`',
    '64/75 会员中心支付结果 bbox 采样：提示为 `left:231rpx/top:393rpx/288rpx*98rpx`',
    '76-会员中心-未支付出弹窗.png bbox 采样：白色弹层为 `left:0rpx/top:1236rpx/750rpx*388rpx`，确认按钮为 `left:44rpx/top:1443rpx/664rpx*98rpx`',
    '65/71 微信支付态原生系统面板参考：白色系统面板顶部均为 `top:578rpx`；键盘为微信原生 UI，不作为业务手写门禁',
    '08/60/61/62/63 会员中心状态图 bbox 采样：会员卡统一为 `left:25rpx/top:182rpx/700rpx*268rpx`',
    '60/61/62/78 会员卡头像金边 bbox 采样：`left:52rpx/top:241rpx/92rpx*92rpx`；63 未开通态为 `left:51rpx/top:241rpx/92rpx*92rpx`',
    '08/60/61/62/63 会员套餐轨道 bbox 采样：前三张卡为 `left:29rpx/top:508.5rpx/210rpx*239.5rpx`、`left:253rpx/top:504rpx/218rpx*248rpx`、`left:481rpx/top:504rpx/218rpx*248rpx`',
    '08-会员中心-全.png bbox 采样：前两张权益卡为 `top:856rpx/1044rpx`，尺寸均为 `700rpx*168rpx`',
    '63-会员中心-会员未开通，支付按钮固定下方.png bbox 采样：白色固定底栏约 `left:1rpx/top:1387rpx/748rpx*236rpx`',
    '60/62 会员中心固定底栏 bbox 采样：白色底栏为 `left:1rpx/top:1387rpx/748rpx*236rpx`；61 连续包年为 `left:1rpx/top:1361rpx/748rpx*262rpx`',
    '78-订阅管理.png bbox 采样：会员卡 `top:182rpx/700rpx*268rpx`，三行扣费说明 `top:570/678/786rpx`，取消指引卡约 `top:1003rpx/height:1007rpx`，底部按钮 `top:2053rpx/height:98rpx`',
    '78-订阅管理.png 内嵌微信流程截图 bbox 采样：STEP1 白底图约 `left:51rpx/top:1136rpx/340.5rpx*230rpx`，STEP2 白底图约 `left:51rpx/top:1496rpx/341.5rpx*390rpx`',
    '78-订阅管理.png 红色标注 bbox 采样：STEP1 箭头约 `left:346rpx/top:1246rpx/17rpx*34.5rpx`、前往红框约 `left:318.5rpx/top:1294.5rpx/65.5rpx*43rpx`；STEP2 箭头约 `left:305.5rpx/top:1657rpx/44.5rpx*41.5rpx`、服务项红框约 `left:73.5rpx/top:1707.5rpx/313.5rpx*95.5rpx`',
  ]) {
    assert.ok(report.includes(note), `验收报告必须记录参考图 bbox 静态采样证据: ${note}`)
  }
}

const SOURCE_EVIDENCE = [
  {
    label: '会员 hook 支付状态机',
    file: 'src/hooks/useMembership.ts',
    snippets: [
      'MembershipPayState',
      "type MembershipPayState = 'idle' | 'wechat-pay' | 'pay-success' | 'pay-cancel' | 'unpaid-sheet'",
      'payState',
      'openWechatPay',
      'simulatePaySuccess',
      'simulatePayCancel',
      'showUnpaidSheet',
      'hidePaymentLayer',
      'function defaultPlanForVariant',
      'useState<MembershipPlan | null>(() => defaultPlanForVariant(variant))',
    ],
  },
  {
    label: '会员页 payState 路由和支付面板',
    file: 'src/pages/membership/index.tsx',
    snippets: [
      'resolveMembershipPayState',
      'MembershipPaymentLayer',
      'WechatPayDemoFallback',
      'WechatMockPayPanel',
      'PayResultModal',
      'UnpaidBottomSheet',
      '用户取消支付',
      '确认开通会员',
      "height: '388rpx'",
      'onSubscription',
      "/pages/membership/subscription",
      'getHeroBottomText(status',
      '尊贵特权已过期，重启会员，精准匹配、自由畅聊',
      'shouldShowRecords',
      'function MemberRecordEntry',
      'onRecords={onRecords}',
      '查看记录',
      "status === 'expired'",
      "const navTitle = variant === 'expired' ? undefined : '会员中心'",
      'title={navTitle}',
      '已过期',
      'getBenefitTitle(variant)',
      'function getBenefitTitle',
      "if (variant === 'annual') return 'VIP特权'",
      'VIP特权',
      'getAgreementText(plan, variant)',
      'formatSubscriptionAmount',
      "replace(/\\.00$/, '')",
      '连续订阅会员服务协议',
      "borderRadius: '98rpx'",
      'const initialActivePlan',
      'useState<number | null>(initialActivePlan?.id ?? null)',
    ],
  },
  {
    label: '会员权益 MCP 图标切片',
    file: 'src/pages/membership/index.tsx',
    snippets: [
      'MEMBER_BENEFIT_ICONS',
      'memberBenefitMatch',
      'memberBenefitReplay',
      'memberDivider',
      'MemberBenefitIcon',
    ],
  },
  {
    label: '千寻币 hook 支付状态机',
    file: 'src/hooks/useCoins.ts',
    snippets: [
      'CoinPayState',
      "type CoinPayState = 'idle' | 'wechat-pay' | 'pay-success' | 'pay-cancel'",
      'payState',
      'openWechatPay',
      'simulatePaySuccess',
      'simulatePayCancel',
      'hidePaymentLayer',
    ],
  },
  {
    label: '千寻币页支付和充值须知',
    file: 'src/pages/coins/index.tsx',
    snippets: [
      'resolveCoinPayState',
      'showRechargeNotice',
      'RechargeNoticeModal',
      'CoinsPaymentLayer',
      'WechatPayDemoFallback',
      'WechatMockPayPanel',
      'PayResultModal',
      'AgreementConfirmSheet',
      "variant === 'recharge-notice'",
      "borderRadius: '14rpx'",
      "borderRadius: '8rpx'",
      "borderRadius: '64rpx'",
    ],
  },
  {
    label: '千寻币用途 OSS 独立图标',
    file: 'src/pages/coins/index.tsx',
    snippets: [
      'usages={usages}',
      'function UsageCard',
      'usage.icon',
      "width: '99rpx'",
      "height: '99rpx'",
    ],
  },
  {
    label: '订阅管理独立页',
    file: 'src/pages/membership/subscription.tsx',
    snippets: [
      '订阅管理',
      '套餐与扣费说明',
      '取消续费指引',
      '查看会员订单',
      '自动续费管理',
    ],
  },
  {
    label: '会员详情独立页',
    file: 'src/pages/membership/record-detail.tsx',
    snippets: [
      '会员详情',
      '已支付',
      '已退款',
      '订单金额',
      '付款方式',
    ],
  },
]

const VISUAL_TOKEN_EVIDENCE = [
  {
    label: '会员已开通状态套餐名',
    file: 'src/data/lanhuDemo.json',
    snippets: [
      '"planName": "连续包年"',
      '"originalAmount": "¥688.00"',
    ],
  },
  {
    label: '订阅管理取消续费指引卡',
    file: 'src/pages/membership/subscription.tsx',
    snippets: [
      '续费周期',
      '会员状态',
      "border: '1rpx solid #1B3C68'",
      "padding: '6rpx 25rpx 60rpx'",
      "height: '268rpx'",
      "height: '98rpx'",
      "marginTop: first ? '24rpx' : '10rpx'",
      "marginTop: '23rpx'",
      "height: '1007rpx'",
      'isLast',
      "marginBottom: isLast ? '0' : '48rpx'",
      "lineHeight: '34rpx'",
      "background: '#242122'",
      "marginTop: '43rpx'",
      "width: '342rpx'",
      "height: '230rpx'",
      "height: '390rpx'",
    ],
  },
  {
    label: '微信原生支付 demo fallback 边界',
    file: 'src/components/WechatMockPayPanel.tsx',
    snippets: [
      '微信支付键盘为微信原生系统面板',
      '只用于蓝湖 demo 预览',
      'wx.requestPayment',
      '不渲染微信数字键盘',
      '取消支付',
      '支付成功',
      'onClick={onCancel}',
      'onClick={onSuccess}',
    ],
  },
  {
    label: '千寻币底部协议弹层',
    file: 'src/pages/coins/index.tsx',
    snippets: [
      "height: '388rpx'",
      "padding: '107rpx 44rpx 0'",
      "borderRadius: '40rpx 40rpx 0 0'",
      '继续支付',
      '我已阅读并同意',
    ],
  },
]

const FORBIDDEN_COMMERCIAL_TEXT_FILES = [
  'src/data/lanhuDemo.json',
  'src/pages/coins/index.tsx',
  'src/pages/coins/detail.tsx',
  'src/hooks/useCoins.ts',
  'src/hooks/useProfile.ts',
  'src/pages/profile/index.tsx',
  'src/pages/featured/index.tsx',
  'src/components/UserCard/index.tsx',
  'src/services/mock.ts',
  'src/services/payment.ts',
  'src/types/coin.ts',
]

const FORBIDDEN_NATIVE_PAY_TOAST_FILES = [
  'src/hooks/useCoins.ts',
  'src/hooks/useMembership.ts',
]

const REQUIRED_MISSING_SLICE_NOTES = [
  '千寻币明细暂无记录插画 MCP slices 为 0',
  '会员权益已使用 08 MCP 图标切片',
  '会员状态页 60/61/62/63 MCP slices 均为 0',
  '会员记录 MCP slices 为 0',
  '会员详情 MCP 只返回纯色矩形 shape',
  '会员中心装饰分隔图标已使用 MCP 切片',
  '订阅管理会员卡专用无文案背景',
  '订阅管理「取消续费指引」里的两张微信流程截图',
  '微信支付态 65/71 MCP slices 均为 0',
  '底部协议弹层 76/79 MCP slices 均为 0',
  '微信支付键盘属于微信原生系统 UI，不纳入业务页面手写 1:1',
  '缺失切图处只做占位，不作为 1:1 完成项',
  '禁止从整页参考图热区硬裁缺失素材为运行切图',
]

const REQUIRED_MCP_SLICE_RECHECK_NOTES = [
  '2026-07-08 MCP slices 复查',
  '千寻币明细-暂无数据：totalSlices=0',
  '会员记录：totalSlices=0',
  '会员记录-详情（已支付）：totalSlices=1，仅纯色矩形 shape',
  '会员记录-详情（已退款）：totalSlices=1，仅纯色矩形 shape',
  '会员中心-已开通：totalSlices=0',
  '会员中心-已过期：totalSlices=0',
  '会员中心-连续包年：totalSlices=0',
  '会员中心-会员未开通，支付按钮固定下方：totalSlices=0',
  '会员中心-微信支付：totalSlices=0',
  '订阅管理：totalSlices=0',
]

const REQUIRED_MISSING_SLICE_LEDGER_NOTES = [
  '## 商业化页面缺失切图复查',
  '禁止从整页参考图热区硬裁为运行切图',
  '千寻币用途：已从整卡切图拆为 8 个独立 2x PNG，并已原样上传 OSS',
  '千寻币明细-暂无数据：totalSlices=0，缺空态插画独立切图',
  '会员记录：totalSlices=0，缺会员菱形图标和退款章切图',
  '会员记录详情：仅返回纯色矩形 shape，不接入业务切图',
  '会员中心状态页 60/61/62/63：totalSlices=0，缺无文案会员卡背景切图',
  '订阅管理：totalSlices=0，缺会员卡背景和 STEP1/STEP2 微信流程截图切图',
  '微信支付态 65/71：totalSlices=0，微信支付键盘为微信原生 UI',
  '底部协议弹层 76/79：totalSlices=0，按整页参考图采样手写',
  '会员套餐第 4 张卡片完整展开：蓝湖首屏只露出右缘，缺完整展开标注',
]

const REQUIRED_MISSING_SLICE_REPLACEMENT_MAP_NOTES = [
  '## 缺失切图替换映射',
  '| 缺口 | 页面/状态 | 源码占位 | 替换目标 | 不可硬裁说明 |',
  '| 千寻币用途 8 个独立 icon | 09-千寻币 | `coin-usage/` 8 个独立 PNG | OSS 原样 URL + 真实文字组件 | 不再引用整卡切图 |',
  '| 千寻币明细空态插画 | 67-千寻币明细-暂无数据 | `EmptyState` / `EmptyPlusMark` / `EmptyRingMark` | 空态插画独立 PNG/WebP | 不从 67 整页图热区硬裁 |',
  '| 会员中心无文案会员卡背景 | 60/61/62/63 会员状态页、78-订阅管理 | `MemberHeroPattern` / `SubscriptionHeroPattern` | 无文案会员卡背景切图 | 不复用含旧文案的 `member-vip-bg.webp` |',
  '| 会员记录图标与退款章 | 58-会员记录 | `MemberRecordDiamond` / `RefundStamp` | 会员菱形图标、退款章独立切图 | 不从 58 整页图热区硬裁 |',
  '| 会员记录详情纯色 shape | 59/77 会员记录详情 | `SummaryCard` / `InfoCard` 源码结构 | 有业务图标时重新导出切片 | 不接入无语义纯色矩形 shape |',
  '| 订阅管理 STEP 微信流程图 | 78-订阅管理 | `SearchPlaceholder` / `RenewPlaceholder` | STEP1/STEP2 微信流程截图切图 | 不从 78 整页图热区硬裁 |',
  '| 微信支付原生键盘 | 65/71 微信支付态 | `WechatMockPayPanel` demo fallback | 真机 `wx.requestPayment` 原生截图 | 不手写数字键盘，不把 fallback 当生产 UI |',
  '| 底部协议弹层 | 76/79 底部弹层 | `UnpaidBottomSheet` / `AgreementConfirmSheet` | 蓝湖组件切片或截图差异验收 | 不从 76/79 整页图热区硬裁 |',
]

const REQUIRED_UNCLOSED_VISUAL_DIFF_NOTES = [
  '只读复核确认：会员记录的 `MemberRecordDiamond`、`RefundStamp` 仍为结构化占位，缺真实菱形图标和退款章星形/圆弧细节切图',
  '只读复核确认：订阅管理的 `SubscriptionHeroPattern`、`SearchPlaceholder`、`RenewPlaceholder` 仍为结构化占位，缺专用会员卡无文案背景和两张微信流程截图切图',
  '旧参考图 `miniapp/.lanhu-ref/会员中心/会员记录.png` 与当前 `58-会员记录.png` 文案口径冲突，当前 manifest 以 `58-会员记录.png` 为主锚点',
]

const REQUIRED_MISSING_SLICE_FALLBACKS = [
  {
    note: '会员权益已使用 08 MCP 图标切片',
    file: 'src/pages/membership/index.tsx',
    snippets: ['MEMBER_BENEFIT_ICONS', 'MemberBenefitIcon', 'miniappOssIcons.memberBenefitMatch'],
  },
  {
    note: '会员状态页 60/61/62/63 MCP slices 均为 0',
    file: 'src/pages/membership/index.tsx',
    snippets: ['function MemberHeroPattern', "background: '#2B2928'", "height: '268rpx'"],
  },
  {
    note: '会员记录 MCP slices 为 0',
    file: 'src/pages/membership/records.tsx',
    snippets: ['function MemberRecordDiamond', 'function RefundStamp', "transform: 'rotate(-24deg)'"],
  },
  {
    note: '会员详情 MCP 只返回纯色矩形 shape',
    file: 'src/pages/membership/record-detail.tsx',
    snippets: ['function SummaryCard', 'function InfoCard', "height: '528rpx'"],
  },
  {
    note: '会员中心装饰分隔图标已使用 MCP 切片',
    file: 'src/pages/membership/index.tsx',
    snippets: ['memberDividerLeft', 'memberDividerRight', 'member-slice-group-5-a.png'],
  },
  {
    note: '订阅管理会员卡专用无文案背景',
    file: 'src/pages/membership/subscription.tsx',
    snippets: ['function SubscriptionHeroPattern', "height: '268rpx'", "background: '#2B2928'"],
  },
  {
    note: '订阅管理「取消续费指引」里的两张微信流程截图',
    file: 'src/pages/membership/subscription.tsx',
    snippets: ['function SearchPlaceholder', 'function RenewPlaceholder', 'SearchGuideArrow', 'RenewGuideArrow'],
  },
  {
    note: '微信支付态 65/71 MCP slices 均为 0',
    file: 'src/components/WechatMockPayPanel.tsx',
    snippets: ['WechatMockPayPanel', '微信支付键盘为微信原生系统面板', '只用于蓝湖 demo 预览'],
  },
  {
    note: '底部协议弹层 76/79 MCP slices 均为 0',
    file: 'src/pages/membership/index.tsx',
    snippets: ['function UnpaidBottomSheet', "height: '388rpx'", '确认并开通'],
  },
  {
    note: '底部协议弹层 76/79 MCP slices 均为 0',
    file: 'src/pages/coins/index.tsx',
    snippets: ['function AgreementConfirmSheet', "height: '388rpx'", '继续支付'],
  },
]

const ALLOWED_MISSING_SLICE_PLACEHOLDER_FUNCTIONS = [
  'MemberHeroPattern',
  'MemberRecordDiamond',
  'MemberRecordGemLine',
  'RefundStamp',
  'RefundStampArc',
  'RefundStampStar',
  'SubscriptionHeroPattern',
  'SearchPlaceholder',
  'RenewPlaceholder',
]

const REQUIRED_MEMBERSHIP_PLAN_NAMES = [
  '连续包年',
  '连续包季',
  '连续包月',
  '年卡会员',
]

const REQUIRED_MEMBERSHIP_REGULAR_PLAN_NAMES = [
  '包年',
  '包季',
  '包月',
]

const REQUIRED_MEMBER_BENEFIT_ICON_SOURCES = [
  { iconKey: "'heart-list'", assetVar: 'memberBenefitMatch', label: '心动名单' },
  { iconKey: "'visitor-eye'", assetVar: 'memberBenefitEyeOpen', label: '访客' },
  { iconKey: "'yo-message'", assetVar: 'memberBenefitGreeting', label: '悄悄话' },
  { iconKey: "'extra-browse'", assetVar: 'memberBenefitRecommend', label: '额外浏览' },
  { iconKey: 'filter', assetVar: 'memberBenefitFilter', label: '筛选' },
  { iconKey: 'exposure', assetVar: 'memberBenefitExposure', label: '曝光' },
  { iconKey: 'stealth', assetVar: 'memberBenefitStealth', label: '隐身' },
  { iconKey: 'replay', assetVar: 'memberBenefitReplay', label: '回放' },
  { iconKey: "'daily-heart'", assetVar: 'memberBenefitDailyHeart', label: '每日心动机会' },
]

const REQUIRED_COIN_REFERENCE_BY_DESIGN = {
  千寻币: '09-千寻币.png',
  '千寻币明细': '66-千寻币明细.png',
  '千寻币明细-暂无数据': '67-千寻币明细-暂无数据.png',
  '千寻币-支付成功': '68-千寻币-支付成功.png',
  '千寻币-取消支付': '69-千寻币-取消支付.png',
  '千寻币-协议勾选': '70-千寻币-协议勾选.png',
  '千寻币-微信支付': '71-千寻币-微信支付.png',
  '千寻币-充值须知': '72-千寻币-充值须知.png',
  '千寻币-点支付未勾选协议': '79-千寻币-点支付未勾选协议.png',
}

const REQUIRED_ACCEPTANCE_MATRIX_NOTES = [
  '## 页面状态清单与静态覆盖矩阵',
  '矩阵结论：以下状态均已接入路由、mock 数据和静态 bbox/source 门禁；但缺图占位和原生支付态仍不作为严格 1:1 完成。',
  '微信原生系统 UI，不绘制键盘',
  '结构化占位，缺真实切图',
  'MCP 切片接入',
]

function readJson(filePath) {
  assert.ok(fs.existsSync(filePath), `缺少数据文件: ${path.relative(rootDir, filePath)}`)
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readAppRoutes() {
  const content = fs.readFileSync(appConfigPath, 'utf8')
  const routeSet = new Set()
  const pageMatches = [...content.matchAll(/'([^']+)'/g)].map((match) => match[1])
  const topLevelPages = pageMatches.filter((value) => value.startsWith('pages/'))
  for (const page of topLevelPages) {
    routeSet.add(`/${page}`)
  }

  const subPackageBlocks = [...content.matchAll(/root:\s*'([^']+)'[\s\S]*?pages:\s*\[([\s\S]*?)\]/g)]
  for (const [, root, pageBlock] of subPackageBlocks) {
    const pages = [...pageBlock.matchAll(/'([^']+)'/g)].map((match) => match[1])
    for (const page of pages) {
      routeSet.add(`/${root}/${page}`)
    }
  }

  return routeSet
}

function cleanRoute(route) {
  return route.split('?')[0]
}

function assertRoute(routeSet, route, label) {
  assert.equal(typeof route, 'string', `${label} 缺少 route`)
  assert.ok(routeSet.has(cleanRoute(route)), `${label} 路由未注册: ${route}`)
}

function assertUiDesign(section, expected) {
  const uiDesigns = data[section]?.uiDesigns
  assert.ok(Array.isArray(uiDesigns), `${section}.uiDesigns 必须是数组`)

  for (const expectedItem of expected) {
    const uiDesign = uiDesigns.find((item) => item.designName === expectedItem.designName)
    assert.ok(uiDesign, `${section}.uiDesigns 缺少设计稿: ${expectedItem.designName}`)
    assert.equal(uiDesign.route, expectedItem.route, `${expectedItem.designName} route 必须指向指定状态`)
    assert.equal(uiDesign.variant, expectedItem.variant, `${expectedItem.designName} variant 必须指向指定状态`)
    assertRoute(routeSet, uiDesign.route, expectedItem.designName)

    const design = data.designs.find((candidate) => candidate.name === expectedItem.designName)
    assert.ok(design, `manifest 缺少设计稿: ${expectedItem.designName}`)
    assert.equal(design.status, 'implemented', `${expectedItem.designName} 必须标记为 implemented`)
    assert.equal(design.route, expectedItem.route, `${expectedItem.designName} manifest route 必须和 uiDesigns 一致`)
    assert.ok(Array.isArray(design.assetRefs), `${expectedItem.designName} assetRefs 必须是数组`)
    assert.ok(design.assetRefs.length > 0, `${expectedItem.designName} 必须关联至少 1 个切图或蓝湖参考资产`)
  }
}

function assertSourceEvidence() {
  for (const item of [...SOURCE_EVIDENCE, ...VISUAL_TOKEN_EVIDENCE]) {
    const sourcePath = path.join(rootDir, item.file)
    assert.ok(fs.existsSync(sourcePath), `${item.label} 文件不存在: ${item.file}`)
    const source = fs.readFileSync(sourcePath, 'utf8')
    for (const snippet of item.snippets) {
      assert.ok(source.includes(snippet), `${item.label} 缺少源码证据: ${snippet}`)
    }
  }
}

function assertNoGenericCommercialPlaceholderUsage() {
  const legacyPlaceholderPath = path.join(rootDir, 'src/components/CommercePlaceholderIcon.tsx')
  assert.ok(
    !fs.existsSync(legacyPlaceholderPath),
    '旧 CommercePlaceholderIcon 泛用占位组件不应继续保留，避免后续用字符/符号冒充切图',
  )

  const srcDir = path.join(rootDir, 'src')
  const sourceFiles = collectSourceFiles(srcDir)
  for (const sourcePath of sourceFiles) {
    const source = fs.readFileSync(sourcePath, 'utf8')
    assert.ok(
      !source.includes('CommercePlaceholderIcon'),
      `${path.relative(rootDir, sourcePath)} 不应引用旧 CommercePlaceholderIcon 泛用占位`,
    )
  }

  for (const file of COMMERCIAL_PAGE_FILES) {
    const sourcePath = path.join(rootDir, file)
    assert.ok(fs.existsSync(sourcePath), `商业化页面不存在: ${file}`)
    const source = fs.readFileSync(sourcePath, 'utf8')
    assert.ok(!source.includes('CommercePlaceholderIcon'), `${file} 不应使用 CommercePlaceholderIcon 泛用占位`)
  }

  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  assert.ok(
    report.includes('商业化页面不再使用 CommercePlaceholderIcon 泛用占位'),
    '验收报告必须说明商业化页面不再使用 CommercePlaceholderIcon 泛用占位',
  )
  assert.ok(
    report.includes('旧 CommercePlaceholderIcon 泛用占位组件已移除'),
    '验收报告必须说明旧 CommercePlaceholderIcon 泛用占位组件已移除',
  )
}

function collectSourceFiles(dir) {
  const result = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...collectSourceFiles(entryPath))
      continue
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      result.push(entryPath)
    }
  }
  return result
}

function assertReferenceImages() {
  for (const imageName of REQUIRED_REFERENCE_IMAGES) {
    assert.ok(fs.existsSync(path.join(LANHU_REF_DIR, imageName)), `缺少蓝湖参考截图: ${imageName}`)
  }

  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  assert.ok(
    report.includes('蓝湖 MCP 当前列表为 93 张；商业化验收以设计稿名称和本地参考图文件名绑定为准'),
    '验收报告必须说明当前 MCP 列表顺序已更新，商业化编号仅作为本地参考图文件名锚点',
  )
}

function assertAcceptancePageMatrix() {
  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  for (const note of REQUIRED_ACCEPTANCE_MATRIX_NOTES) {
    assert.ok(report.includes(note), `验收报告必须包含页面状态矩阵说明: ${note}`)
  }

  for (const item of [...REQUIRED_COMMERCE_DESIGNS.membership, ...REQUIRED_COMMERCE_DESIGNS.coins]) {
    assert.ok(
      report.includes(`| ${item.designName} |`),
      `页面状态矩阵必须逐页登记设计稿: ${item.designName}`,
    )
    assert.ok(
      report.includes(`| \`${item.route}\` |`),
      `页面状态矩阵必须登记 ${item.designName} 的路由: ${item.route}`,
    )
  }
}

function assertNoLegacyCoinName() {
  for (const file of FORBIDDEN_COMMERCIAL_TEXT_FILES) {
    const sourcePath = path.join(rootDir, file)
    assert.ok(fs.existsSync(sourcePath), `商业化文案文件不存在: ${file}`)
    const source = fs.readFileSync(sourcePath, 'utf8')
    assert.ok(!source.includes('成家币'), `${file} 不应再出现“成家币”，请统一为“千寻币”`)
  }
}

function assertNoNativePaySuccessToast() {
  for (const file of FORBIDDEN_NATIVE_PAY_TOAST_FILES) {
    const sourcePath = path.join(rootDir, file)
    const source = fs.readFileSync(sourcePath, 'utf8')
    assert.ok(!source.includes("Taro.showToast({ title: '支付成功'"), `${file} 不应使用原生支付成功 toast，应由蓝湖自定义提示承接`)
  }
}

function assertMissingSlicesAreReported() {
  assert.ok(fs.existsSync(acceptanceReportPath), `缺少商业化蓝湖验收报告: ${path.relative(rootDir, acceptanceReportPath)}`)
  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  for (const note of REQUIRED_MISSING_SLICE_NOTES) {
    assert.ok(report.includes(note), `验收报告必须登记缺失切图或占位边界: ${note}`)
  }
}

function assertMissingSliceLedgerIsDetailed() {
  assert.ok(fs.existsSync(missingSlicesPath), `缺少蓝湖缺失切片清单: ${path.relative(rootDir, missingSlicesPath)}`)
  assert.ok(
    fs.existsSync(trackedMissingSliceLedgerPath),
    `缺少仓库内可追踪缺失切图台账: ${path.relative(rootDir, trackedMissingSliceLedgerPath)}`,
  )
  const ledger = fs.readFileSync(missingSlicesPath, 'utf8')
  const trackedLedger = fs.readFileSync(trackedMissingSliceLedgerPath, 'utf8')
  for (const note of REQUIRED_MISSING_SLICE_LEDGER_NOTES) {
    assert.ok(ledger.includes(note), `蓝湖缺失切片清单必须登记商业化缺口和禁止硬裁边界: ${note}`)
    assert.ok(trackedLedger.includes(note), `仓库内缺失切图台账必须登记商业化缺口和禁止硬裁边界: ${note}`)
  }

  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  assert.ok(
    report.includes('2026-07-08-商业化蓝湖缺失切图台账.md'),
    '验收报告必须引用仓库内可追踪缺失切图台账',
  )
}

function assertMissingSliceReplacementMapIsDetailed() {
  const ledger = fs.readFileSync(missingSlicesPath, 'utf8')
  const trackedLedger = fs.readFileSync(trackedMissingSliceLedgerPath, 'utf8')
  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  for (const note of REQUIRED_MISSING_SLICE_REPLACEMENT_MAP_NOTES) {
    assert.ok(ledger.includes(note), `蓝湖缺失切片清单必须登记缺失切图替换映射: ${note}`)
    assert.ok(trackedLedger.includes(note), `仓库内缺失切图台账必须登记缺失切图替换映射: ${note}`)
    assert.ok(report.includes(note), `验收报告必须登记缺失切图替换映射: ${note}`)
  }
}

function assertMcpSliceRecheckIsRecorded() {
  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  for (const note of REQUIRED_MCP_SLICE_RECHECK_NOTES) {
    assert.ok(report.includes(note), `验收报告必须记录最新 MCP slices 复查结果: ${note}`)
  }
}

function assertUnclosedVisualDiffsAreExplicit() {
  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  for (const note of REQUIRED_UNCLOSED_VISUAL_DIFF_NOTES) {
    assert.ok(report.includes(note), `验收报告必须登记只读复核发现的未闭环视觉差异: ${note}`)
  }
}

function assertMissingSliceFallbacksAreTraceable() {
  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  for (const item of REQUIRED_MISSING_SLICE_FALLBACKS) {
    assert.ok(report.includes(item.note), `缺切图项必须先登记到验收报告: ${item.note}`)
    const sourcePath = path.join(rootDir, item.file)
    assert.ok(fs.existsSync(sourcePath), `缺切图项 ${item.note} 的源码占位文件不存在: ${item.file}`)
    const source = fs.readFileSync(sourcePath, 'utf8')
    for (const snippet of item.snippets) {
      assert.ok(source.includes(snippet), `缺切图项 ${item.note} 缺少源码占位证据 ${item.file}: ${snippet}`)
    }
  }
}

function assertMissingSliceFallbackAllowlistIsExplicit() {
  const discovered = new Set()
  for (const file of COMMERCIAL_PAGE_FILES) {
    const sourcePath = path.join(rootDir, file)
    const source = fs.readFileSync(sourcePath, 'utf8')
    for (const match of source.matchAll(/function\s+([A-Za-z0-9_]*(?:Placeholder|Pattern|Empty|Diamond|Stamp|GemLine)[A-Za-z0-9_]*)\s*\(/g)) {
      const name = match[1]
      if (
        name.includes('Placeholder')
        || name.includes('Pattern')
        || name.includes('Empty')
        || name.includes('Diamond')
        || name.includes('Stamp')
        || name.includes('GemLine')
      ) {
        discovered.add(name)
      }
    }
  }

  assert.deepEqual(
    [...discovered].sort(),
    [...ALLOWED_MISSING_SLICE_PLACEHOLDER_FUNCTIONS].sort(),
    '缺失切图占位函数必须显式 allowlist，新增占位需要先登记缺口，拿到切图后删除对应函数',
  )

  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  assert.ok(
    report.includes('缺失切图占位 allowlist'),
    '验收报告必须列出缺失切图占位 allowlist，避免把占位误判为 1:1 完成',
  )
  for (const name of ALLOWED_MISSING_SLICE_PLACEHOLDER_FUNCTIONS) {
    assert.ok(report.includes(name), `验收报告缺失占位 allowlist 函数: ${name}`)
  }
}

function assertMembershipPlanRailMatchesLanhu() {
  const plans = data.membership?.plans
  assert.ok(Array.isArray(plans), 'membership.plans 必须是数组')
  assert.ok(plans.length >= 4, '会员套餐轨道必须至少 4 张卡片，以匹配蓝湖右侧露出的第 4 张卡片')

  const names = plans.map((plan) => plan.name)
  for (const name of REQUIRED_MEMBERSHIP_PLAN_NAMES) {
    assert.ok(names.includes(name), `会员套餐缺少蓝湖轨道卡片: ${name}`)
  }

  const plainAnnual = plans.find((plan) => plan.name === '年卡会员')
  assert.ok(plainAnnual, '缺少普通年卡套餐')
  assert.equal(plainAnnual.durationLabel, '12个月', '普通年卡套餐周期必须是 12个月')

  const regularPlans = data.membership?.regularPlans
  assert.ok(Array.isArray(regularPlans), 'membership.regularPlans 必须存在，用于单独承接 08-会员中心-全 普通套餐')
  const regularNames = regularPlans.map((plan) => plan.name)
  for (const name of REQUIRED_MEMBERSHIP_REGULAR_PLAN_NAMES) {
    assert.ok(regularNames.includes(name), `08-会员中心-全 普通套餐缺少: ${name}`)
  }
  const regularAnnual = regularPlans.find((plan) => plan.name === '包年')
  assert.equal(regularAnnual?.price, 568, '08-会员中心-全 包年底部支付价必须是 568')
  assert.equal(regularAnnual?.originalPrice, 688, '08-会员中心-全 包年原价必须是 688')
  assert.equal(regularAnnual?.monthlyPriceLabel, '¥57.33/月', '08-会员中心-全 包年月均价必须匹配蓝湖')
  for (const [designName, imageName] of Object.entries(REQUIRED_MEMBERSHIP_REFERENCE_BY_DESIGN)) {
    const design = data.designs.find((item) => item.name === designName)
    assert.ok(design, `manifest 缺少会员中心设计稿: ${designName}`)
    assert.ok(
      design.assetRefs?.includes(`.lanhu-ref/lanhu-full-2026-07-07/images/${imageName}`),
      `${designName} manifest assetRefs 必须直指蓝湖参考图 ${imageName}`,
    )
    assert.ok(
      !(design.assetRefs ?? []).includes('src/assets/lanhu/pages/member-vip-bg.webp'),
      `${designName} manifest 不能继续登记带文案残影的 member-vip-bg.webp`,
    )
  }

  const membershipHomeDesign = data.designs.find((item) => item.name === '会员中心-全')
  for (const assetRef of REQUIRED_MEMBER_BENEFIT_ASSETS) {
    assert.ok(
      membershipHomeDesign?.assetRefs?.includes(assetRef),
      `会员中心-全 manifest assetRefs 必须登记 MCP 权益切片资产: ${assetRef}`,
    )
  }

  const membershipSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/index.tsx'), 'utf8')
  for (const snippet of [
    "type MembershipPageVariant = 'default' | 'none' | 'active' | 'expired' | 'annual'",
    "return 'default'",
    'monthlyPriceLabel',
    "height: '100vh'",
    "flex: 1,\n          height: '0',\n          minHeight: '0'",
    "padding: '6rpx 25rpx 48rpx'",
    "height: '268rpx'",
    "height: '248rpx'",
    "marginRight: '8rpx'",
    "left: '27rpx'",
    "width: '92rpx'",
    "height: '92rpx'",
    "borderRadius: '46rpx'",
    "marginTop: '39rpx'",
    "paddingTop: '16rpx'",
    "top: '-16rpx'",
    "height: '36rpx'",
    "fontSize: '16rpx'",
    'splitDurationLabel',
    "fontSize: '42rpx'",
    "fontSize: '26rpx'",
    "fontSize: '18rpx'",
    "height: '104rpx'",
    "marginTop: '26rpx'",
    "right: '38rpx'",
    "top: '58rpx'",
    "lineHeight: '40rpx'",
  ]) {
    assert.ok(membershipSource.includes(snippet), `会员中心默认态缺少 08 独立普通套餐证据: ${snippet}`)
  }
  assert.ok(!membershipSource.includes('MEMBERSHIP_PAY_BAR_RESERVED_RPX'), '会员中心不能继续用固定 328rpx 猜测支付栏高度')
  assert.ok(!membershipSource.includes("position: 'fixed',\n        left: '0',\n        right: '0',\n        bottom: '0',\n        minHeight: variant"), '会员中心支付栏必须参与根容器 flex 布局')
  assert.ok(
    membershipSource.includes("padding: '40rpx 25rpx max(30rpx, env(safe-area-inset-bottom))'"),
    '会员中心支付栏安全区必须在基础留白和设备安全区之间取较大值，不能重复累加',
  )
  assert.ok(membershipSource.includes('function MemberHeroPattern'), '会员中心会员卡缺少无文案几何纹理背景')
  assert.ok(!membershipSource.includes('member-vip-bg'), '会员中心不能复用带文案的 member-vip-bg.webp')
  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  assert.ok(
    report.includes('会员中心查看记录入口固定为页面专属结构'),
    '验收报告必须说明会员中心查看记录入口固定为页面专属结构',
  )

  const membershipHookSource = fs.readFileSync(path.join(rootDir, 'src/hooks/useMembership.ts'), 'utf8')
  for (const snippet of [
    "type MembershipDemoVariant = 'default' | 'none' | 'active' | 'expired' | 'annual'",
    'plansForVariant',
    'membershipDemo.regularPlans',
  ]) {
    assert.ok(membershipHookSource.includes(snippet), `会员 hook 缺少默认态和连续订阅态套餐拆分证据: ${snippet}`)
  }
}

function assertMembershipBenefitIconMapping() {
  const membershipSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/index.tsx'), 'utf8')
  const mappingMatch = membershipSource.match(/const MEMBER_BENEFIT_ICONS:[\s\S]*?= \{([\s\S]*?)\n\}/)
  assert.ok(mappingMatch, '会员中心缺少 MEMBER_BENEFIT_ICONS 切片映射')
  const mappedIconKeys = new Set(
    [...mappingMatch[1].matchAll(/(?:['"]([^'"]+)['"]|([A-Za-z_][A-Za-z0-9_-]*))\s*:/g)].map(
      (match) => match[1] || match[2],
    ),
  )

  const benefits = data.membership?.benefits
  assert.ok(Array.isArray(benefits), 'membership.benefits 必须是数组')
  for (const benefit of benefits) {
    assert.ok(mappedIconKeys.has(benefit.icon), `会员权益 icon 未映射 MCP 切片，不能静默使用泛用占位: ${benefit.icon}`)
  }
  for (const item of REQUIRED_MEMBER_BENEFIT_ICON_SOURCES) {
    assert.ok(
      mappingMatch[1].includes(`${item.iconKey}: { src: ${item.assetVar}`),
      `会员权益 ${item.label} 图标必须按图形语义映射到指定 MCP 切片变量: ${item.assetVar}`,
    )
  }
  assert.ok(
    !membershipSource.includes('if (!iconAsset)'),
    '会员权益图标不能保留未映射静默 fallback，应由数据校验或显式错误暴露缺切图',
  )
  assert.ok(
    !membershipSource.includes("borderRadius: '39rpx', background: LANHU_GOLD"),
    '会员权益图标不能用金色圆形作为静默泛用 fallback',
  )

  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  assert.ok(
    report.includes('会员权益未映射 icon 不允许静默泛用占位'),
    '验收报告必须说明会员权益未映射 icon 不允许静默泛用占位',
  )
  assert.ok(
    report.includes('会员权益切片映射不再保留静默金色圆形 fallback'),
    '验收报告必须说明会员权益切片映射不再保留静默金色圆形 fallback',
  )
  assert.ok(
    report.includes('会员权益切片按图形语义映射，文件名不作为业务语义'),
    '验收报告必须说明会员权益切片按图形语义映射，文件名不作为业务语义',
  )
}

function assertMembershipSubscriptionPricing() {
  assert.equal(data.membership?.subscription?.renewalAmount, '¥568.00', '连续订阅优惠价必须是 ¥568.00')
  assert.equal(data.membership?.subscription?.originalAmount, '¥688.00', '连续订阅原价必须是 ¥688.00')
  const annualPlan = data.membership?.plans?.find((plan) => plan.id === data.membership?.annualPlanId)
  assert.equal(annualPlan?.price, 568, '61-会员中心-连续包年 卡片支付价必须是 568')
  assert.equal(annualPlan?.originalPrice, 568, '61-会员中心-连续包年 卡片下方原价必须按蓝湖显示 ¥568.00')
}

function assertMembershipPaymentOverlaysMatchLanhu() {
  assert.equal(data.membership?.wechatPayPreviewAmount, '268.00', '会员中心微信支付预览态金额必须匹配 65-会员中心-微信支付.png')

  const membershipSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/index.tsx'), 'utf8')
  for (const snippet of [
      'const requestedVariant = resolveMembershipVariant',
      "const variant = routePayState === 'idle' ? requestedVariant : 'annual'",
      'const [agreementChecked, setAgreementChecked] = useState(false)',
      'showUnpaidSheet()',
      'handleConfirmAgreement',
      'handlePaySuccess',
      'handlePayCancel',
      'setAgreementChecked(true)',
      'setAgreementChecked(false)',
      'checked={agreementChecked}',
      'onToggle={() => setAgreementChecked((checked) => !checked)}',
      "const paymentPreviewAmount = routePayState === 'wechat-pay' ? membershipDemo.wechatPayPreviewAmount : undefined",
      'previewAmount={paymentPreviewAmount}',
      'onConfirmAgreement={handleConfirmAgreement}',
      'onSuccess={handlePaySuccess}',
      'onCancel={handlePayCancel}',
      'previewAmount ?? plan?.price.toFixed(2) ??',
      'PayResultModal',
      "left: '231rpx'",
      "top: '393rpx'",
      "width: '288rpx'",
      "height: '98rpx'",
    "background: 'rgba(255, 255, 255, 0.32)'",
    "background: 'rgba(0, 0, 0, 0.32)'",
  ]) {
    assert.ok(membershipSource.includes(snippet), `会员支付结果浮层缺少蓝湖结构证据: ${snippet}`)
  }
  assert.ok(
    !membershipSource.includes("background: 'rgba(0, 0, 0, 0.48)'"),
    '会员微信支付遮罩透明度应匹配 65-会员中心-微信支付.png 的约 0.32，不应继续使用 0.48',
  )
  assert.ok(
    !membershipSource.includes("marginLeft: '40rpx', marginTop: '12rpx'"),
    '连续包年协议优惠文案应跟随协议文本自然换行，不应额外缩进 40rpx',
  )
  assert.ok(
    !membershipSource.includes('onPay={onSuccess}'),
    '会员未支付弹层确认不能直接模拟支付成功，应先进入微信支付面板',
  )
  assert.ok(
    !membershipSource.includes('onSuccess={simulatePaySuccess}'),
    '会员支付成功回调必须先复位协议勾选，再展示 64 的空心协议圆点状态',
  )
  assert.ok(
    !membershipSource.includes('onCancel={simulatePayCancel}'),
    '会员取消支付回调必须先复位协议勾选，再展示 75 的空心协议圆点状态',
  )
  assert.ok(
    !membershipSource.includes('function WechatPayPanel'),
    '会员页微信支付 wrapper 必须命名为 demo fallback，避免误判为手写微信原生面板',
  )

  const coinsSource = fs.readFileSync(path.join(rootDir, 'src/pages/coins/index.tsx'), 'utf8')
  assert.ok(
    !coinsSource.includes('function WechatPayPanel'),
    '千寻币页微信支付 wrapper 必须命名为 demo fallback，避免误判为手写微信原生面板',
  )
}

function assertWechatPaymentFallbackDoesNotDrawNativeKeyboard() {
  const fallbackSource = fs.readFileSync(path.join(rootDir, 'src/components/WechatMockPayPanel.tsx'), 'utf8')
  const paymentServiceSource = fs.readFileSync(path.join(rootDir, 'src/services/payment.ts'), 'utf8')
  const coinsHookSource = fs.readFileSync(path.join(rootDir, 'src/hooks/useCoins.ts'), 'utf8')
  const membershipHookSource = fs.readFileSync(path.join(rootDir, 'src/hooks/useMembership.ts'), 'utf8')
  for (const forbidden of [
    'const KEYS',
    "['1', '2', '3'",
    "'⌫'",
    'DeleteKeyIcon',
    'Keyboard',
    'keyboard',
    'Keypad',
    'keypad',
    'Password',
    'password',
    'Digit',
    'digit',
    '密码格',
    '支付密码',
    '九宫格',
    "height: '456rpx'",
    "width: '250rpx'",
  ]) {
    assert.ok(
      !fallbackSource.includes(forbidden),
      `WechatMockPayPanel 不能继续手写微信原生支付键盘结构: ${forbidden}`,
    )
  }
  for (const required of [
    '不渲染微信数字键盘',
    'onSuccess',
    'onCancel',
    '取消支付',
    '支付成功',
  ]) {
    assert.ok(fallbackSource.includes(required), `WechatMockPayPanel demo fallback 缺少边界或闭环动作: ${required}`)
  }
  for (const forbiddenVisibleText of [
    '正式环境由 wx.requestPayment 唤起',
    '模拟支付成功',
    '模拟取消支付',
    '微信原生支付',
  ]) {
    assert.ok(
      !fallbackSource.includes(forbiddenVisibleText),
      `WechatMockPayPanel 不能在可见 UI 中展示开发说明或模拟字样: ${forbiddenVisibleText}`,
    )
  }

  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  assert.ok(
    report.includes('`WechatMockPayPanel` 不再手写微信数字支付键盘，只保留 demo 支付结果动作'),
    '验收报告必须说明 demo fallback 不再手写微信数字支付键盘',
  )
  assert.ok(
    report.includes('WechatMockPayPanel 可见 UI 不再展示模拟字样或 wx.requestPayment 开发说明'),
    '验收报告必须说明 demo fallback 可见 UI 不再展示模拟字样或开发说明',
  )
  for (const forbiddenReportPhrase of [
    'demo fallback 面板仍保留 6 位密码输入',
    '退格和 submitted 锁',
    '输入满 6 位',
    '输入 6 位密码',
  ]) {
    assert.ok(
      !report.includes(forbiddenReportPhrase),
      `验收报告不能保留旧手写支付键盘口径: ${forbiddenReportPhrase}`,
    )
  }
  assert.ok(paymentServiceSource.includes('export interface WechatPayParams'), '支付服务必须定义微信原生支付参数类型')
  assert.ok(paymentServiceSource.includes('export async function requestWechatPayment'), '支付服务必须封装 wx.requestPayment 原生调用')
  assert.ok(paymentServiceSource.includes('timeStamp') && paymentServiceSource.includes('paySign'), '微信支付参数类型必须覆盖 timeStamp/paySign')
  assert.ok(coinsHookSource.includes("createOrder(selectedPackage.id, 'coin')"), '千寻币支付必须先创建订单获取支付参数')
  assert.ok(coinsHookSource.includes('requestWechatPayment(order)'), '千寻币支付必须按订单模式调用微信原生支付')
  assert.ok(coinsHookSource.includes('openWechatPay()'), '千寻币缺少支付参数时必须保留蓝湖 demo fallback 闭环')
  assert.ok(membershipHookSource.includes("createOrder(selectedPlan.id, 'vip')"), '会员支付必须先创建订单获取支付参数')
  assert.ok(membershipHookSource.includes('requestWechatPayment(order)'), '会员支付必须按订单模式调用微信原生支付')
  assert.ok(membershipHookSource.includes('const openWechatPay'), '会员必须保留蓝湖微信支付预览态入口')
}

function assertMembershipRecordPagesMatchLanhu() {
  const records = data.membership?.records
  assert.ok(Array.isArray(records), 'membership.records 必须是数组')
  assert.equal(records.length, 2, '蓝湖会员记录页应展示 2 条记录')
  assert.equal(records[0]?.listTitle, '时空邂逅会员连续包年', '会员记录首条列表标题必须匹配蓝湖')
  assert.equal(records[1]?.listTitle, '时空邂逅会员包年', '会员记录退款列表标题必须匹配蓝湖')
  for (const record of records) {
    assert.equal(record.durationLabel, '12个月', '会员记录卡片右侧周期必须是 12个月')
    assert.equal(record.validityStart, '2026.05.28 15:58', '会员记录列表有效期起始必须匹配蓝湖')
    assert.equal(record.validityEnd, '2027.05.27 15:58', '会员记录列表有效期截止必须匹配蓝湖')
    assert.equal(record.planName, '连续包年', '会员详情摘要标题必须匹配 77/59 蓝湖详情页')
    assert.equal(record.startTime, '2027.05.26 15:58', '会员详情会员生效日必须匹配 77/59 蓝湖详情页')
    assert.equal(record.endTime, '2027.05.27 15:58', '会员详情会员到期日必须匹配 77/59 蓝湖详情页')
  }

  const recordsSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/records.tsx'), 'utf8')
  for (const snippet of [
    'recordsLoading && filteredRecords.length === 0',
    "padding: '6rpx 25rpx 60rpx'",
    'record.listTitle',
    'record.durationLabel',
    'record.validityStart',
    'record.validityEnd',
    'function MemberRecordDiamond',
    "left: '20rpx'",
    "top: '41rpx'",
    "width: '58rpx'",
    "height: '58rpx'",
    'function MemberRecordGemLine',
    'MemberRecordGemLine tone={tone} left="12rpx" top="10rpx" width="34rpx" rotate="0deg"',
    'MemberRecordGemLine tone={tone} left="7rpx" top="17rpx" width="23rpx" rotate="45deg"',
    'MemberRecordGemLine tone={tone} left="27rpx" top="17rpx" width="23rpx" rotate="-45deg"',
    'MemberRecordGemLine tone={tone} left="13rpx" top="31rpx" width="24rpx" rotate="45deg"',
    'MemberRecordGemLine tone={tone} left="23rpx" top="31rpx" width="24rpx" rotate="-45deg"',
    'function RefundStamp',
    "left: '280rpx'",
    "top: '24rpx'",
    "width: '232rpx'",
    "height: '164rpx'",
    "border: '6rpx solid rgba(150,150,150,0.48)'",
    "width: '184rpx'",
    "height: '58rpx'",
    "transform: 'rotate(-24deg)'",
    'function RefundStampArc',
    'function RefundStampStar',
    'RefundStampArc left="42rpx" top="2rpx" width="142rpx" height="142rpx" rotate="-18deg"',
    'RefundStampArc left="42rpx" top="2rpx" width="142rpx" height="142rpx" rotate="162deg"',
    "borderTop: '10rpx solid rgba(150,150,150,0.34)'",
    "borderLeft: '10rpx solid rgba(150,150,150,0.34)'",
    'RefundStampStar left="86rpx" top="17rpx" size="22rpx"',
    'RefundStampStar left="122rpx" top="7rpx" size="24rpx"',
    'RefundStampStar left="78rpx" top="128rpx" size="22rpx"',
    'RefundStampStar left="124rpx" top="120rpx" size="23rpx"',
  ]) {
    assert.ok(recordsSource.includes(snippet), `会员记录页缺少蓝湖结构证据: ${snippet}`)
  }
  assert.ok(!recordsSource.includes('◇'), '会员记录页不能再用纯文本菱形冒充会员图标')
  assert.ok(!recordsSource.includes('◆'), '会员记录页不能用纯文本实心菱形冒充会员图标')
  assert.ok(!recordsSource.includes('★'), '会员记录退款章不能用文本星形冒充印章装饰')
  assert.ok(!recordsSource.includes('☆'), '会员记录退款章不能用文本空心星形冒充印章装饰')
  assert.ok(
    !recordsSource.includes('{startTime} – {endTime}'),
    '会员记录有效期分隔符必须匹配蓝湖和 mock 数据中的半角连字符，不应使用 en dash',
  )
  assert.ok(
    recordsSource.includes('{startTime} - {endTime}'),
    '会员记录有效期必须使用蓝湖口径的半角连字符分隔起止时间',
  )

  const membershipSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/index.tsx'), 'utf8')
  assert.ok(!membershipSource.includes('暂不开通'), '会员未支付弹层不能出现蓝湖参考图之外的次按钮')
  for (const snippet of [
    "height: '388rpx'",
    "padding: '28rpx 44rpx 0'",
    "lineHeight: '48rpx'",
    "marginTop: '30rpx'",
    "lineHeight: '50rpx'",
    "marginTop: '50rpx'",
  ]) {
    assert.ok(membershipSource.includes(snippet), `会员未支付底部弹层缺少 76 蓝湖结构证据: ${snippet}`)
  }

  const recordDesign = data.designs.find((item) => item.name === '会员记录')
  assert.ok(
    recordDesign?.assetRefs?.includes('.lanhu-ref/lanhu-full-2026-07-07/images/58-会员记录.png'),
    '会员记录 manifest assetRefs 必须直指 58-会员记录.png 蓝湖参考图',
  )

  const membershipHookSource = fs.readFileSync(path.join(rootDir, 'src/hooks/useMembership.ts'), 'utf8')
  assert.ok(
    membershipHookSource.includes('useState<MembershipRecord[]>(membershipDemo.records)'),
    '会员记录页 mock 数据必须首屏即展示，避免蓝湖默认态截图先出现加载/空态',
  )

  const detailSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/record-detail.tsx'), 'utf8')
  for (const snippet of [
    'const recordId = Number(router.params.id || 0)',
    'const record = resolveRecord(refunded, recordId)',
    'record.id === recordId && record.status === expectedStatus',
    "padding: '8rpx 25rpx 0'",
    "height: '168rpx'",
    "padding: '34rpx 30rpx'",
    "right: '30rpx'",
    "top: '32rpx'",
    "height: '40rpx'",
    "borderRadius: '0 16rpx 0 16rpx'",
    "marginTop: '20rpx'",
    "height: '528rpx'",
    "padding: '0 30rpx'",
    "borderRadius: '8rpx'",
    "height: '88rpx'",
    "fontSize: '32rpx'",
    "maxWidth: '500rpx'",
  ]) {
    assert.ok(detailSource.includes(snippet), `会员详情页缺少蓝湖信息卡结构证据: ${snippet}`)
  }

  const report = fs.readFileSync(acceptanceReportPath, 'utf8')
  assert.ok(
    report.includes('会员记录列表与会员详情页按蓝湖参考图保留两套字段口径'),
    '验收报告必须说明 58 列表与 77/59 详情字段口径不同是蓝湖参考图差异，不应误改为业务一致口径',
  )
  assert.ok(
    report.includes('会员记录退款章内部圆弧和星形装饰继续收敛'),
    '验收报告必须说明会员记录退款章内部圆弧和星形装饰已继续收敛',
  )
  assert.ok(
    report.includes('会员记录菱形会员图标内部切面继续收敛'),
    '验收报告必须说明会员记录菱形会员图标内部切面已继续收敛',
  )

  const subscriptionSource = fs.readFileSync(path.join(rootDir, 'src/pages/membership/subscription.tsx'), 'utf8')
  assert.ok(subscriptionSource.includes('function SubscriptionHeroPattern'), '订阅管理会员卡缺少无文案几何纹理占位')
  assert.ok(!subscriptionSource.includes('member-vip-bg'), '订阅管理不能复用带文案的 member-vip-bg.webp')
  for (const snippet of [
    'function GuideStepLabel',
    'function SearchPlaceholder',
    'function RenewPlaceholder',
    'function WechatBackIcon',
    'function WechatMicIcon',
    'function WechatMoreIcon',
    'function WechatChevronIcon',
    'function WechatPayMiniIcon',
    'function MemberAutoRenewMiniIcon',
    'AI搜索',
    '全部',
    '前往',
    'SearchGuideArrow',
    'RenewGuideArrow',
    "right: '8rpx', top: '158rpx', width: '66rpx', height: '43rpx'",
    "right: '30rpx', top: '110rpx', width: '17rpx', height: '35rpx'",
    "left: '22rpx', top: '211rpx', width: '314rpx', height: '96rpx'",
    "right: '43rpx', top: '161rpx', width: '45rpx', height: '42rpx'",
    "border: '2rpx solid #F54646'",
    '时空邂逅会员年卡自动续费',
    '2025年7月26日开通服务',
    "height: '390rpx'",
  ]) {
    assert.ok(subscriptionSource.includes(snippet), `订阅管理取消续费指引缺少微信流程截图关键占位: ${snippet}`)
  }
  assert.ok(!subscriptionSource.includes('• {step}'), '订阅管理 STEP 圆点不能用文本 bullet 冒充，应使用结构化圆点')
  assert.ok(!subscriptionSource.includes('>•</Text>'), '订阅管理 STEP 圆点不能用独立文本 bullet 冒充')
  assert.ok(!subscriptionSource.includes('>□</Text>'), '订阅管理微信搜索占位不能用文本方框冒充微信支付图标')
  assert.ok(!subscriptionSource.includes('>卡</Text>'), '订阅管理自动续费占位不能用文字“卡”冒充服务图标')
  assert.ok(!subscriptionSource.includes('>‹</Text>'), '订阅管理微信流程占位不能用文本 ‹ 冒充返回图标')
  assert.ok(!subscriptionSource.includes('>◦</Text>'), '订阅管理微信搜索占位不能用文本 ◦ 冒充语音图标')
  assert.ok(!subscriptionSource.includes('>•••</Text>'), '订阅管理自动续费占位不能用文本 ••• 冒充更多图标')
  assert.ok(!subscriptionSource.includes('>›</Text>'), '订阅管理自动续费占位不能用文本 › 冒充右箭头')
  const subscriptionReport = fs.readFileSync(acceptanceReportPath, 'utf8')
  assert.ok(
    subscriptionReport.includes('订阅管理微信流程导航符号不再使用文本字符冒充'),
    '验收报告必须说明订阅管理微信流程导航符号不再使用文本字符冒充',
  )
  assert.ok(
    subscriptionReport.includes('订阅管理 STEP 标记不再使用文本 bullet 冒充'),
    '验收报告必须说明订阅管理 STEP 标记不再使用文本 bullet 冒充',
  )
  assert.ok(
    subscriptionReport.includes('订阅管理 STEP 红框/箭头源码锚点继续收敛'),
    '验收报告必须说明订阅管理 STEP 红框/箭头源码锚点已按 78 bbox 收敛',
  )
  const subscriptionHeroTextAnchors = subscriptionSource.match(/left: '150rpx'/g) ?? []
  assert.ok(
    subscriptionHeroTextAnchors.length >= 2,
    '订阅管理会员卡昵称和连续包年胶囊应按 78-订阅管理.png 对齐到卡片内 left: 150rpx',
  )
  for (const snippet of [
    "left: '27rpx'",
    "top: '59rpx'",
    "width: '92rpx'",
    "height: '92rpx'",
    "borderRadius: '46rpx'",
  ]) {
    assert.ok(subscriptionSource.includes(snippet), `订阅管理会员卡头像缺少 78 蓝湖结构证据: ${snippet}`)
  }

  const subscriptionDesign = data.designs.find((item) => item.name === '订阅管理')
  assert.ok(
    subscriptionDesign?.assetRefs?.includes('.lanhu-ref/lanhu-full-2026-07-07/images/78-订阅管理.png'),
    '订阅管理 manifest assetRefs 必须直指 78-订阅管理.png 蓝湖参考图',
  )
}

function assertCoinPagesMatchLanhu() {
  const packages = data.coins?.packages
  assert.ok(Array.isArray(packages), 'coins.packages 必须是数组')
  const hotPackage = packages.find((item) => item.amount === 3000)
  assert.ok(hotPackage, '千寻币套餐缺少 3000 热销套餐')
  assert.equal(hotPackage.originalPrice, '¥301.12', '3000 千寻币套餐原价必须匹配蓝湖')
  assert.equal(hotPackage.discountLabel, '8.9折', '3000 千寻币套餐折扣必须匹配蓝湖')
  const savingPackage = packages.find((item) => item.amount === 6000)
  assert.ok(savingPackage, '千寻币套餐缺少 6000 节省最多套餐')
  assert.equal(savingPackage.originalPrice, '¥602.82', '6000 千寻币套餐原价必须匹配蓝湖')
  assert.equal(savingPackage.discountLabel, '7.1折', '6000 千寻币套餐折扣必须匹配蓝湖')

  for (const [designName, imageName] of Object.entries(REQUIRED_COIN_REFERENCE_BY_DESIGN)) {
    const design = data.designs.find((item) => item.name === designName)
    assert.ok(design, `manifest 缺少千寻币设计稿: ${designName}`)
    assert.ok(
      design.assetRefs?.includes(`.lanhu-ref/lanhu-full-2026-07-07/images/${imageName}`),
      `${designName} manifest assetRefs 必须直指蓝湖参考图 ${imageName}`,
    )
  }
  const coinHomeDesign = data.designs.find((item) => item.name === '千寻币')
  for (const assetRef of [
    'src/assets/lanhu/pages/coin-gold.png',
    'src/assets/lanhu/pages/coin-usage/whisper.png',
    'src/assets/lanhu/pages/coin-usage/limited-activity.png',
  ]) {
    assert.ok(
      coinHomeDesign?.assetRefs?.includes(assetRef),
      `千寻币 manifest assetRefs 必须登记 MCP 切片资产: ${assetRef}`,
    )
  }

  const coinTypeSource = fs.readFileSync(path.join(rootDir, 'src/types/coin.ts'), 'utf8')
  for (const snippet of ['originalPrice?: string', 'discountLabel?: string']) {
    assert.ok(coinTypeSource.includes(snippet), `千寻币套餐类型缺少蓝湖字段: ${snippet}`)
  }

  const coinsSource = fs.readFileSync(path.join(rootDir, 'src/pages/coins/index.tsx'), 'utf8')
  for (const snippet of [
    'pkg.originalPrice',
    'pkg.discountLabel',
    "const [agreementChecked, setAgreementChecked] = useState(variant === 'checked' || routePayState !== 'idle')",
    "textDecorationLine: 'line-through'",
    'coinGold',
    'miniappOssIcons.coinGold',
    'CoinAmountLabel',
    'function CoinAmountLabel',
    'function CoinChevronIcon',
    'usages={usages}',
    'miniappOssIcons.coinBalanceBackground',
    "height: '100vh'",
    "flex: 1,\n          height: '0',\n          minHeight: '0'",
    "padding: '6rpx 25rpx 48rpx'",
    "height: '188rpx'",
    'scrollLeft={railScrollLeft}',
    "width: '640rpx'",
    "paddingTop: '16rpx'",
    "width: '240rpx'",
    "height: '184rpx'",
    "fontSize: '26rpx'",
    "fontSize: '18rpx'",
    "fontSize: '30rpx'",
    "fontSize: '16rpx'",
    "fontSize: '40rpx'",
    "left: '231rpx'",
    "top: '393rpx'",
    "width: '288rpx'",
    "height: '98rpx'",
    "background: '#ADADAD'",
    'rechargeNotice.title',
    'rechargeNotice.faqTitle',
    'rechargeNotice.contactText',
    'rechargeNotice.confirmText',
    "justifyContent: 'flex-start'",
    "padding: '386rpx 65rpx 0'",
    "width: '620rpx'",
    "height: '570rpx'",
    "height: '310rpx'",
    "lineHeight: '44rpx'",
    "height: '478rpx'",
    "padding: '20rpx 44rpx max(30rpx, env(safe-area-inset-bottom))'",
    "marginTop: '24rpx'",
    "width: '32rpx',\n            height: '32rpx',\n            borderRadius: '16rpx'",
    "width: '17rpx'",
    "height: '10rpx'",
    "borderLeft: '4rpx solid #FFFFFF'",
  ]) {
    assert.ok(coinsSource.includes(snippet), `千寻币首页缺少蓝湖结构证据: ${snippet}`)
  }
  assert.ok(!coinsSource.includes("marginLeft: '-97rpx'"), '千寻币套餐轨道不能继续用负边距制造双侧裁切')
  assert.ok(!coinsSource.includes('BalanceWatermarks'), '余额卡不得继续用 CSS 近似绘制蓝湖水印')
  assert.ok(coinsSource.includes('miniappOssIcons.coinBalanceBackground'), '余额卡必须使用无文案的蓝湖 MCP 原始背景')
  assert.ok(!coinsSource.includes('coinUsageSlice'), '千寻币用途不得继续使用整卡切图，避免文字和图标重影')
  assert.ok(!coinsSource.includes('coin-usage-slice.png'), '千寻币用途不得继续引用整卡 PNG')

  const ossIconSource = fs.readFileSync(path.join(rootDir, 'src/constants/ossIcons.ts'), 'utf8')
  for (const snippet of [
    'coinUsageWhisper',
    'coinUsageLimitedActivity',
    'coinGold',
    'memberBenefitMatch',
    'Object.freeze',
  ]) {
    assert.ok(ossIconSource.includes(snippet), `非底部图标 OSS 清单缺少: ${snippet}`)
  }

  const uploadScript = fs.readFileSync(path.join(rootDir, 'scripts/upload-miniapp-oss-icons.mjs'), 'utf8')
  for (const snippet of [
    "'backend', '.env.local'",
    'DEV_OSS_ACCESS_KEY_ID',
    'DEV_OSS_ACCESS_KEY_SECRET',
    'createHmac',
    'createHash',
    'Content-Length',
    'Buffer.from',
    '不会转换、缩放或压缩图像',
  ]) {
    assert.ok(uploadScript.includes(snippet), `OSS 图标上传脚本缺少无损保障: ${snippet}`)
  }
  const coinDarkMaskMatches = coinsSource.match(/background: 'rgba\(0, 0, 0, 0\.48\)'/g) ?? []
  assert.equal(
    coinDarkMaskMatches.length,
    1,
    '千寻币微信支付遮罩透明度应匹配 71-千寻币-微信支付.png 的约 0.32，只允许充值须知保留 0.48 遮罩',
  )
  assert.ok(!coinsSource.includes('>›</Text>'), '千寻币首页入口箭头不能用文本 › 冒充，应使用结构化右箭头')
  const coinReport = fs.readFileSync(acceptanceReportPath, 'utf8')
  assert.ok(
    coinReport.includes('千寻币首页入口箭头不再使用文本字符冒充'),
    '验收报告必须说明千寻币首页入口箭头不再使用文本字符冒充',
  )

  const coinHookSource = fs.readFileSync(path.join(rootDir, 'src/hooks/useCoins.ts'), 'utf8')
  assert.ok(
    coinHookSource.includes('useState<CoinTransaction[]>(coinsDemo.transactions)'),
    '千寻币明细 mock 数据必须首屏即展示，避免蓝湖默认态截图先出现加载/空态',
  )

  const coinDetailSource = fs.readFileSync(path.join(rootDir, 'src/pages/coins/detail.tsx'), 'utf8')
  for (const snippet of [
    'transactionsLoading && filtered.length === 0',
    "isActive ? LANHU_BLUE : '#999999'",
    "item.amount > 0 ? LANHU_BLUE : '#F32B61'",
    "paddingTop: '262rpx'",
    'function CoinNoDataState',
    'miniappOssIcons.qianxunEmptyChart',
    "width: '334rpx'",
    "height: '251rpx'",
    "marginTop: '87rpx'",
    "width: '664rpx'",
    "height: '98rpx'",
    "borderRadius: '14rpx'",
    "height: '148rpx'",
  ]) {
    assert.ok(coinDetailSource.includes(snippet), `千寻币明细页缺少蓝湖结构证据: ${snippet}`)
  }
  assert.ok(!coinDetailSource.includes('EmptyPlusMark'), '千寻币明细空态不得保留旧加号占位函数')
  assert.ok(!coinDetailSource.includes('EmptyRingMark'), '千寻币明细空态不得保留旧圆环占位函数')
  assert.ok(!coinDetailSource.includes('>+</Text>'), '千寻币明细空态插画不能用文本 + 冒充线性装饰')
  assert.ok(!coinDetailSource.includes('>。</Text>'), '千寻币明细空态插画不能用中文句号冒充圆形装饰')
}

function assertProductionCommercialFlow() {
  const membershipHook = fs.readFileSync(path.join(rootDir, 'src/hooks/useMembership.ts'), 'utf8')
  const coinHook = fs.readFileSync(path.join(rootDir, 'src/hooks/useCoins.ts'), 'utf8')
  const membershipPage = fs.readFileSync(path.join(rootDir, 'src/pages/membership/index.tsx'), 'utf8')
  const coinPage = fs.readFileSync(path.join(rootDir, 'src/pages/coins/index.tsx'), 'utf8')
  const paymentService = fs.readFileSync(path.join(rootDir, 'src/services/payment.ts'), 'utf8')
  const appConfig = fs.readFileSync(appConfigPath, 'utf8')
  const paymentController = fs.readFileSync(path.resolve(rootDir, '../backend/src/main/java/com/spacetime/miniapp/controller/PaymentController.java'), 'utf8')
  const paymentServiceImpl = fs.readFileSync(path.resolve(rootDir, '../backend/src/main/java/com/spacetime/miniapp/service/impl/PaymentServiceImpl.java'), 'utf8')
  const assetService = fs.readFileSync(path.resolve(rootDir, '../backend/src/main/java/com/spacetime/miniapp/service/impl/AssetServiceImpl.java'), 'utf8')
  const commercialPage = fs.readFileSync(path.resolve(rootDir, '../frontend/src/pages/commercial/CommercialManagement.tsx'), 'utf8')

  for (const [label, source] of [
    ['会员支付', membershipHook],
    ['千寻币支付', coinHook],
    ['会员页面', membershipPage],
    ['千寻币页面', coinPage],
  ]) {
    assert.doesNotMatch(source, /getDemoPageData|simulatePaySuccess|simulatePayCancel|WechatMockPayPanel|WechatPayDemoFallback|mockPay/, `${label}不得保留假数据或模拟支付入口`)
  }
  assert.match(membershipHook, /createOrder\(selectedPlan\.id, 'vip'\)/)
  assert.match(membershipHook, /requestWechatPayment/)
  assert.match(membershipHook, /confirmPaidOrder\(order\.orderId\)/)
  assert.match(membershipHook, /\/pages\/commerce\/payment-result\?orderId=/)
  assert.match(coinHook, /createOrder\(selectedPackage\.id, 'coin'\)/)
  assert.match(coinHook, /requestWechatPayment/)
  assert.match(coinHook, /confirmPayment\(order\.orderId\)/)
  assert.match(coinHook, /getCoinBalance/)
  assert.match(coinHook, /getCoinFlows/)
  assert.match(paymentService, /\/miniapp\/payment\/orders/)
  assert.match(paymentService, /\/miniapp\/coin\/scenes/)
  assert.match(appConfig, /pages\/commerce\/payment-result/)
  assert.match(paymentController, /@GetMapping\("\/orders\/\{orderId\}"\)/)
  assert.doesNotMatch(paymentController, /mock-pay/)
  assert.match(paymentServiceImpl, /closeExpiredOrder/)
  assert.match(paymentServiceImpl, /updateCoinBalance/)
  assert.match(assetService, /normalizeSceneCode/)
  assert.match(assetService, /isIdealScene/)
  assert.match(commercialPage, /getCommercialConfig/)
  assert.match(commercialPage, /saveCommercialConfig/)
  assert.match(commercialPage, /getCommercialFlowList/)
  assert.match(commercialPage, /getCommercialRefundList/)
  assert.doesNotMatch(commercialPage, /data-commercial-demo|静态闭环版本不生成真实文件/)
}

const data = readJson(dataPath)
const routeSet = readAppRoutes()

assertUiDesign('membership', REQUIRED_COMMERCE_DESIGNS.membership)
assertUiDesign('coins', REQUIRED_COMMERCE_DESIGNS.coins)
assertProductionCommercialFlow()

console.log('商业化真实接口与蓝湖设计清单校验通过')
