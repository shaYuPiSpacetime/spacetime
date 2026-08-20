/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const miniappRoot = path.resolve(__dirname, '..')
const domainPath = path.join(miniappRoot, 'src/domain/promotionInvitePresentation.js')

async function loadDomainModule() {
  assert.ok(fs.existsSync(domainPath), '缺少邀请首页展示领域层')
  const source = fs.readFileSync(domainPath, 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

function ladder(threshold, rewardAmount, achieved = false) {
  return { threshold, rewardAmount, achieved }
}

test('首阶段 10/30/50 档位与进度使用同一阈值坐标系', async () => {
  const { displayedLadderStage } = await loadDomainModule()
  const stage = displayedLadderStage([
    ladder(50, 10),
    ladder(10, 50),
    ladder(30, 100),
  ], 30)

  assert.equal(stage.stageBase, 0)
  assert.equal(stage.max, 50)
  assert.equal(stage.progress, 60)
  assert.deepEqual(
    stage.ladders.map(item => ({ threshold: item.threshold, positionPercent: item.positionPercent })),
    [
      { threshold: 10, positionPercent: 20 },
      { threshold: 30, positionPercent: 60 },
      { threshold: 50, positionPercent: 100 },
    ],
  )
})
test('跨阶段以上一阶段末档为起点计算档位和进度', async () => {
  const { displayedLadderStage } = await loadDomainModule()
  const stage = displayedLadderStage([
    ladder(10, 10, true),
    ladder(30, 20, true),
    ladder(50, 30, true),
    ladder(70, 40, true),
    ladder(100, 50),
    ladder(150, 60),
  ], 70)

  assert.equal(stage.stageBase, 50)
  assert.equal(stage.max, 150)
  assert.equal(stage.progress, 20)
  assert.deepEqual(stage.ladders.map(item => item.positionPercent), [20, 50, 100])
})

test('进度在首尾边界夹紧，空档位保持安全空态', async () => {
  const { displayedLadderStage } = await loadDomainModule()
  const ladders = [
    ladder(10, 10),
    ladder(30, 20),
    ladder(50, 30),
    ladder(70, 40),
    ladder(100, 50),
    ladder(150, 60),
  ]

  assert.equal(displayedLadderStage(ladders, -5).progress, 0)
  assert.equal(displayedLadderStage(ladders, 200).progress, 100)
  assert.deepEqual(displayedLadderStage([], 20), {
    ladders: [],
    stageBase: 0,
    max: 0,
    progress: 0,
  })
})
