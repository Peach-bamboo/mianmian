const automator = require('miniprogram-automator')

const projectPath = process.cwd()
const cliPath = process.env.MP_DEVTOOLS_CLI || '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const pagePath = normalizePagePath(process.env.MP_PAGE || 'pages/home/index')
const timeout = Number(process.env.MP_AUTOMATOR_TIMEOUT || 120000)
const port = Number(process.env.MP_AUTOMATOR_PORT || 9420)
const waitMs = Number(process.env.MP_PAGE_WAIT || 5000)

;(async () => {
  let miniProgram
  try {
    miniProgram = await automator.launch({
      cliPath,
      projectPath,
      port,
      timeout,
      trustProject: true,
    })

    const page = await miniProgram.reLaunch(pagePath)
    if (!page) throw new Error(`Failed to open page: ${pagePath}`)
    await page.waitFor(waitMs)

    const pageData = await page.data()
    const storage = await miniProgram.evaluate(() => {
      const keys = wx.getStorageInfoSync().keys
      const listKeys = keys.filter(key => key.indexOf('question_bank_list:') === 0)
      return {
        meta: wx.getStorageSync('question_bank_meta') || null,
        categories: wx.getStorageSync('question_bank_categories') || [],
        questions: wx.getStorageSync('questions') || [],
        detailKeys: keys.filter(key => key.indexOf('question_bank_detail:') === 0),
        lists: listKeys.map(key => ({
          key,
          value: wx.getStorageSync(key),
        })),
      }
    })

    const sourceQuestions = pageData.sourceQuestions || []
    const modules = pageData.modules || []
    console.log(JSON.stringify({
      page: page.path,
      meta: storage.meta,
      categoryCount: storage.categories.length,
      categoryIds: storage.categories.slice(0, 5).map(item => item.id || item._id),
      pageModuleCount: modules.length,
      pageModuleIds: modules.slice(0, 5).map(item => item.key || item.id),
      storageQuestionCount: storage.questions.length,
      storageQuestionIds: storage.questions.slice(0, 5).map(item => item.id || item._id),
      cloudStyleQuestionIds: storage.questions
        .map(item => String(item.id || item._id || ''))
        .filter(id => id.indexOf('-') > 0)
        .slice(0, 10),
      sourceQuestionCount: sourceQuestions.length,
      sourceQuestionIds: sourceQuestions.slice(0, 5).map(item => item.id || item._id),
      listCaches: storage.lists.map(item => ({
        key: item.key,
        source: item.value?.source || '',
        total: item.value?.total || 0,
        ids: (item.value?.list || []).slice(0, 10).map(question => question.id || question._id),
      })),
      detailKeys: storage.detailKeys,
    }, null, 2))
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    if (miniProgram) await miniProgram.close().catch(() => {})
  }
})()

function normalizePagePath(value) {
  const [pathname, query = ''] = value.replace(/^\/+/, '').split('?')
  return `/${pathname}${query ? `?${query}` : ''}`
}
