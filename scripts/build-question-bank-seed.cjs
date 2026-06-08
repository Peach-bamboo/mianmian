const fs = require('fs')
const path = require('path')

const projectRoot = process.cwd()
const questionsPath = path.join(projectRoot, 'src/data/questions.json')
const outputDir = path.join(projectRoot, '.private/question-bank-seed')

const CATEGORY_META = [
  { _id: 'html', name: 'HTML', shortName: 'H', group: 'base', description: '语义化、结构与浏览器基础', level: '结构与语义', themeColor: '#ff7146', sort: 10 },
  { _id: 'css', name: 'CSS', shortName: 'C', group: 'base', description: '布局、动画、响应式与视觉样式', level: '布局与动画', themeColor: '#5da8ff', sort: 20 },
  { _id: 'js', name: 'JavaScript', shortName: 'JS', group: 'runtime', description: '闭包、原型、异步与语言机制', level: '核心恒星', themeColor: '#32d9ff', sort: 30 },
  { _id: 'vue', name: 'Vue', shortName: 'V', group: 'framework', description: '响应式、组件、diff 与生态工程', level: '响应式生态', themeColor: '#42f5b0', sort: 40 },
  { _id: 'react', name: 'React', shortName: 'R', group: 'framework', description: 'Fiber、Hooks、状态与渲染模型', level: '组件模型', themeColor: '#66dcff', sort: 50 },
  { _id: 'node', name: 'Node', shortName: 'N', group: 'runtime', description: '事件循环、模块系统与服务端基础', level: '运行时服务', themeColor: '#5de879', sort: 60 },
  { _id: 'applet', name: '小程序', shortName: '微', group: 'advanced', description: '生命周期、跨端能力与工程限制', level: '跨端基地', themeColor: '#58ff7a', sort: 70 },
  { _id: 'net', name: '网络', shortName: '网', group: 'advanced', description: 'HTTP、缓存、安全与性能边界', level: '协议星域', themeColor: '#ff9b4b', sort: 80 },
  { _id: 'arithmetic', name: '算法', shortName: '算', group: 'advanced', description: '复杂度、数据结构与解题模型', level: '逻辑晶体', themeColor: '#ffc14d', sort: 90 }
]

const categoryNameMap = new Map(CATEGORY_META.map(item => [item._id, item.name]))

function toStableId(question) {
  if (question._id) return String(question._id)
  if (question.slug) return String(question.slug)
  return `${question.category || 'question'}-${String(question.id).padStart(3, '0')}`
}

function normalizeQuestion(question, index) {
  const categoryId = question.categoryId || question.category || 'unknown'
  const title = question.title || question.question || ''
  const answerMarkdown = question.answerMarkdown || question.answer || ''

  return {
    _id: toStableId(question),
    legacyId: question.id,
    title,
    question: title,
    categoryId,
    categoryName: question.categoryName || categoryNameMap.get(categoryId) || categoryId,
    difficulty: question.difficulty || 'medium',
    tags: Array.isArray(question.tags) ? question.tags : [],
    summary: question.summary || '',
    answer: question.answer || '',
    answerMarkdown,
    diagramType: question.diagramType || '',
    assetIds: Array.isArray(question.assetIds) ? question.assetIds : [],
    status: 'published',
    version: question.version || 1,
    sort: question.sort || (index + 1) * 10,
    searchText: `${title} ${question.summary || ''} ${(question.tags || []).join(' ')}`,
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString()
  }
}

function writeJsonLines(filePath, items) {
  const content = items.map(item => JSON.stringify(item)).join('\n')
  fs.writeFileSync(filePath, `${content}\n`)
}

function main() {
  const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'))
  const normalizedQuestions = questions.map(normalizeQuestion)
  const counts = normalizedQuestions.reduce((map, question) => {
    map.set(question.categoryId, (map.get(question.categoryId) || 0) + 1)
    return map
  }, new Map())

  const categories = CATEGORY_META.map(category => ({
    ...category,
    id: category._id,
    status: 'published',
    questionCount: counts.get(category._id) || 0,
    updatedAt: new Date().toISOString()
  }))

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, 'question_categories.json'), `${JSON.stringify(categories, null, 2)}\n`)
  fs.writeFileSync(path.join(outputDir, 'questions.json'), `${JSON.stringify(normalizedQuestions, null, 2)}\n`)
  writeJsonLines(path.join(outputDir, 'question_categories.jsonl'), categories)
  writeJsonLines(path.join(outputDir, 'questions.jsonl'), normalizedQuestions)
  writeJsonLines(path.join(outputDir, 'question_categories.import.json'), categories)
  writeJsonLines(path.join(outputDir, 'questions.import.json'), normalizedQuestions)

  console.log(`Seed generated: ${outputDir}`)
  console.log(`Categories: ${categories.length}`)
  console.log(`Questions: ${normalizedQuestions.length}`)
  console.log('Wechat import JSON generated: question_categories.import.json, questions.import.json')
}

main()
