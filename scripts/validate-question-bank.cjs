const fs = require('fs')
const path = require('path')

const projectRoot = process.cwd()
const questionsPath = path.join(projectRoot, 'src/data/questions.json')
const seedDir = path.join(projectRoot, '.private/question-bank-seed')

const categoryIds = new Set([
  'html',
  'css',
  'js',
  'vue',
  'react',
  'node',
  'applet',
  'net',
  'arithmetic'
])

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function validateQuestions() {
  const questions = readJson(questionsPath)
  assert(Array.isArray(questions), 'src/data/questions.json must be an array')
  assert(questions.length > 0, 'question bank is empty')

  const ids = new Set()
  const markdownQuestions = []

  questions.forEach((question, index) => {
    const label = `question[${index}]`
    assert(question.id !== undefined && question.id !== null && question.id !== '', `${label}.id is required`)
    assert(!ids.has(String(question.id)), `${label}.id is duplicated: ${question.id}`)
    ids.add(String(question.id))

    assert(categoryIds.has(question.category), `${label}.category is invalid: ${question.category}`)
    assert(typeof question.question === 'string' && question.question.trim(), `${label}.question is required`)
    assert(typeof question.answer === 'string' && question.answer.trim(), `${label}.answer is required`)

    if (question.answerMarkdown) {
      markdownQuestions.push(question)
      assert(question.answerMarkdown.includes('## 核心结论'), `${label}.answerMarkdown should include 核心结论`)
    }
  })

  assert(markdownQuestions.length >= 5, 'at least 5 questions should have answerMarkdown samples')

  return {
    total: questions.length,
    markdownTotal: markdownQuestions.length
  }
}

function validateSeedIfPresent() {
  const categoriesPath = path.join(seedDir, 'question_categories.json')
  const cloudQuestionsPath = path.join(seedDir, 'questions.json')
  const categoriesJsonlPath = path.join(seedDir, 'question_categories.jsonl')
  const questionsJsonlPath = path.join(seedDir, 'questions.jsonl')
  const categoriesImportPath = path.join(seedDir, 'question_categories.import.json')
  const questionsImportPath = path.join(seedDir, 'questions.import.json')

  if (!fs.existsSync(categoriesPath) || !fs.existsSync(cloudQuestionsPath)) {
    return null
  }

  const categories = readJson(categoriesPath)
  const questions = readJson(cloudQuestionsPath)

  assert(Array.isArray(categories), 'seed question_categories.json must be an array')
  assert(Array.isArray(questions), 'seed questions.json must be an array')
  assert(categories.length >= 1, 'seed categories are empty')
  assert(questions.length >= 1, 'seed questions are empty')

  questions.forEach((question, index) => {
    const label = `seed.questions[${index}]`
    assert(question._id, `${label}._id is required`)
    assert(question.status === 'published', `${label}.status should be published`)
    assert(question.title, `${label}.title is required`)
    assert(question.categoryId, `${label}.categoryId is required`)
    assert(question.answerMarkdown, `${label}.answerMarkdown is required`)
  })

  if (fs.existsSync(categoriesJsonlPath) && fs.existsSync(questionsJsonlPath)) {
    assert(readJsonLines(categoriesJsonlPath).length === categories.length, 'seed question_categories.jsonl count mismatch')
    assert(readJsonLines(questionsJsonlPath).length === questions.length, 'seed questions.jsonl count mismatch')
  }

  if (fs.existsSync(categoriesImportPath) && fs.existsSync(questionsImportPath)) {
    assert(readJsonLines(categoriesImportPath).length === categories.length, 'seed question_categories.import.json count mismatch')
    assert(readJsonLines(questionsImportPath).length === questions.length, 'seed questions.import.json count mismatch')
  }

  return {
    seedCategories: categories.length,
    seedQuestions: questions.length
  }
}

function readJsonLines(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line)
      } catch (error) {
        throw new Error(`${path.basename(filePath)} line ${index + 1} is not valid JSON`)
      }
    })
}

function main() {
  const questionReport = validateQuestions()
  const seedReport = validateSeedIfPresent()

  console.log('Question bank validation passed')
  console.log(`Questions: ${questionReport.total}`)
  console.log(`Markdown samples: ${questionReport.markdownTotal}`)
  if (seedReport) {
    console.log(`Seed categories: ${seedReport.seedCategories}`)
    console.log(`Seed questions: ${seedReport.seedQuestions}`)
  } else {
    console.log('Seed files not found; run pnpm question-bank:seed to generate them')
  }
}

main()
