const test = require('node:test')
const assert = require('node:assert/strict')

const {
  mergeQuestionStates,
  mergeStoredQuestionState,
  normalizeId,
  normalizeQuestion,
  normalizeQuestions
} = require('../src/domain/questionBankCore.cjs')

const categories = new Map([
  ['js', { name: 'JavaScript' }]
])

test('normalizes legacy and cloud question fields into one contract', () => {
  const normalized = normalizeQuestion({
    _id: 'js-001',
    title: '什么是事件循环？',
    categoryId: 'js',
    markdown: '## 核心结论',
    tags: ['Promise']
  }, categories)

  assert.equal(normalized.id, 'js-001')
  assert.equal(normalized.question, '什么是事件循环？')
  assert.equal(normalized.category, 'js')
  assert.equal(normalized.categoryName, 'JavaScript')
  assert.equal(normalized.answer, '## 核心结论')
  assert.deepEqual(normalized.tags, ['Promise'])
})

test('normalizes numeric IDs so legacy state can match cloud IDs', () => {
  assert.equal(normalizeId(1), '1')
  assert.equal(normalizeId('1'), '1')
  assert.equal(normalizeId(null), '')
})

test('filters invalid questions without an ID or title', () => {
  const normalized = normalizeQuestions([
    { id: 1, question: '有效题目', category: 'js', answer: '答案' },
    { id: 2, question: '', category: 'js', answer: '答案' },
    { question: '缺少 ID', category: 'js', answer: '答案' }
  ], categories)

  assert.equal(normalized.length, 1)
  assert.equal(normalized[0].id, '1')
})

test('keeps new content while inheriting only user state from stale cache', () => {
  const newQuestion = {
    id: 'js-001',
    question: '新版题干',
    answerMarkdown: '## 新版解析',
    isFavorited: false,
    mastery: ''
  }
  const staleQuestion = {
    id: 'js-001',
    question: '旧版题干',
    answerMarkdown: '',
    answer: '旧版纯文本',
    isFavorited: true,
    mastery: 'mastered'
  }

  const merged = mergeStoredQuestionState(newQuestion, staleQuestion)

  assert.equal(merged.question, '新版题干')
  assert.equal(merged.answerMarkdown, '## 新版解析')
  assert.equal(merged.isFavorited, true)
  assert.equal(merged.mastery, 'mastered')
})

test('merges cloud state for string and numeric question IDs', () => {
  const questions = [
    { id: '1', question: '旧 ID 题目', isFavorited: false, mastery: '' },
    { id: 'js-001', question: '稳定 ID 题目', isFavorited: false, mastery: '' }
  ]
  const states = [
    { questionId: 1, isFavorited: true, mastery: 'retry' },
    { questionId: 'js-001', isFavorited: false, mastery: 'mastered' }
  ]

  const merged = mergeQuestionStates(questions, states)

  assert.deepEqual(
    merged.map(item => [item.id, item.isFavorited, item.mastery]),
    [
      ['1', true, 'retry'],
      ['js-001', false, 'mastered']
    ]
  )
})

test('does not mutate questions without a matching cloud state', () => {
  const question = { id: 'css-001', question: 'BFC', isFavorited: true, mastery: 'retry' }
  const [merged] = mergeQuestionStates([question], [])

  assert.strictEqual(merged, question)
})
