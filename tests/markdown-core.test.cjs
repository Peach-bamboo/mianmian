const test = require('node:test')
const assert = require('node:assert/strict')

const { parseInline, parseMarkdown } = require('../src/domain/markdownCore.cjs')

test('parses the answer structures used by the mini program', () => {
  const markdown = [
    '## 核心结论',
    '',
    '支持 **重点**、`inline()` 和 [文档](https://example.com)。',
    '',
    '1. 同步代码',
    '2. 微任务',
    '',
    '```js',
    'Promise.resolve().then(run)',
    '```',
    '',
    '| 类型 | 优先级 |',
    '| --- | --- |',
    '| 微任务 | 高 |',
    '',
    '![流程图](cloud://event-loop.png)'
  ].join('\n')

  const blocks = parseMarkdown(markdown)

  assert.deepEqual(
    blocks.map(block => block.type),
    ['heading2', 'paragraph', 'list', 'list', 'code', 'table', 'image']
  )
  assert.equal(blocks[4].lang, 'js')
  assert.equal(blocks[4].text, 'Promise.resolve().then(run)')
  assert.deepEqual(blocks[5].rows, [
    ['类型', '优先级'],
    ['微任务', '高']
  ])
  assert.equal(blocks[6].src, 'cloud://event-loop.png')
})

test('parses strong, inline code, and links as explicit inline runs', () => {
  const runs = parseInline('先看 **结论**，再运行 `pnpm test`，参考 [文档](https://example.com)。')

  assert.deepEqual(
    runs.filter(run => run.type !== 'text'),
    [
      { type: 'strong', text: '结论' },
      { type: 'inlineCode', text: 'pnpm test' },
      { type: 'link', text: '文档', href: 'https://example.com' }
    ]
  )
})

test('normalizes Windows line endings and ignores blank lines', () => {
  const blocks = parseMarkdown('# 标题\r\n\r\n> 提示\r\n\r\n- 条目')

  assert.deepEqual(
    blocks.map(block => [block.type, block.text]),
    [
      ['heading1', '标题'],
      ['quote', '提示'],
      ['list', '• 条目']
    ]
  )
})
