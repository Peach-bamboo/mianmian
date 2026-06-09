function normalizeId(value) {
  if (value === undefined || value === null) return ''
  return String(value)
}

function normalizeQuestion(raw = {}, categoryLookup = new Map()) {
  const categoryId = raw.categoryId || raw.category || ''
  const categoryMeta = categoryLookup.get(categoryId) || {}
  const id = normalizeId(raw.id || raw._id)
  const title = raw.title || raw.question || ''
  const answerMarkdown = raw.answerMarkdown || raw.markdown || ''

  return {
    ...raw,
    id,
    _id: raw._id || id,
    title,
    question: title,
    categoryId,
    category: categoryId,
    categoryName: raw.categoryName || categoryMeta.name || categoryId || '题库',
    difficulty: raw.difficulty || 'medium',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    summary: raw.summary || '',
    answer: raw.answer || answerMarkdown,
    answerMarkdown,
    diagramType: raw.diagramType || '',
    assets: Array.isArray(raw.assets) ? raw.assets : [],
    isFavorited: Boolean(raw.isFavorited),
    mastery: raw.mastery || ''
  }
}

function normalizeQuestions(questions = [], categoryLookup = new Map()) {
  return questions
    .map(question => normalizeQuestion(question, categoryLookup))
    .filter(question => question.id && question.question)
}

function mergeStoredQuestionState(question, storedQuestion = {}) {
  return {
    ...question,
    isFavorited: Boolean(storedQuestion.isFavorited),
    mastery: storedQuestion.mastery || ''
  }
}

function mergeQuestionStates(questions = [], states = []) {
  const stateMap = new Map(states.map(item => [normalizeId(item.questionId), item]))
  return questions.map((question) => {
    const state = stateMap.get(normalizeId(question.id))
    if (!state) return question

    return {
      ...question,
      isFavorited: Boolean(state.isFavorited),
      mastery: state.mastery || ''
    }
  })
}

module.exports = {
  mergeQuestionStates,
  mergeStoredQuestionState,
  normalizeId,
  normalizeQuestion,
  normalizeQuestions
}
