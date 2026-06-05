const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')
const automator = require('miniprogram-automator')
const { PNG } = require('pngjs')

const projectPath = process.cwd()
const cliPath = process.env.MP_DEVTOOLS_CLI || '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const pagePath = normalizePagePath(process.env.MP_PAGE || 'pages/home/index')
const screenshotPath = process.env.MP_SCREENSHOT_OUTPUT || path.join(projectPath, 'page-check.png')
const timeout = Number(process.env.MP_AUTOMATOR_TIMEOUT || 60000)
const port = Number(process.env.MP_AUTOMATOR_PORT || 9420)
const waitMs = Number(process.env.MP_PAGE_WAIT || 3000)
const minNonWhiteRatio = Number(process.env.MP_MIN_NON_WHITE_RATIO || 0.01)

if (!fs.existsSync(cliPath)) {
  throw new Error(`Wechat DevTools CLI not found: ${cliPath}`)
}

;(async () => {
  let miniProgram
  const logs = []
  const exceptions = []

  try {
    miniProgram = await launchDevTools()

    miniProgram.on('console', (log) => {
      logs.push(log)
    })

    miniProgram.on('exception', (exception) => {
      exceptions.push(exception)
    })

    const page = await miniProgram.reLaunch(pagePath)
    if (!page) {
      throw new Error(`Failed to open page: ${pagePath}`)
    }

    await page.waitFor(waitMs)
    await miniProgram.screenshot({ path: screenshotPath })

    const result = analyzeScreenshot(screenshotPath, minNonWhiteRatio)
    console.log(`Opened page: ${page.path}`)
    console.log(`Screenshot saved: ${screenshotPath}`)
    console.log(`Non-white pixel ratio: ${(result.nonWhiteRatio * 100).toFixed(2)}%`)

    if (exceptions.length > 0) {
      console.error('Runtime exceptions:')
      exceptions.forEach((exception) => console.error(formatLog(exception)))
      process.exitCode = 1
    }

    if (!result.passed) {
      console.error(`Screenshot looks blank. Expected non-white ratio >= ${(minNonWhiteRatio * 100).toFixed(2)}%.`)
      process.exitCode = 1
    }

    if (process.env.MP_PRINT_LOGS === '1' && logs.length > 0) {
      console.log('Console logs:')
      logs.forEach((log) => console.log(formatLog(log)))
    }
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    if (miniProgram) {
      await miniProgram.close().catch(() => {})
    }
  }
})()

function normalizePagePath(value) {
  const [pathname, query = ''] = value.replace(/^\/+/, '').split('?')
  return `/${pathname}${query ? `?${query}` : ''}`
}

async function launchDevTools() {
  const child = childProcess.spawn(cliPath, [
    'auto',
    '--project',
    projectPath,
    '--port',
    String(port),
    '--trust-project',
  ], {
    detached: true,
    stdio: 'ignore',
  })

  child.unref()

  const startedAt = Date.now()
  const wsEndpoint = `ws://127.0.0.1:${port}`
  let lastError

  while (Date.now() - startedAt < timeout) {
    try {
      return await automator.connect({ wsEndpoint })
    } catch (error) {
      lastError = error
      await sleep(1000)
    }
  }

  throw lastError || new Error(`Failed connecting to ${wsEndpoint}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function analyzeScreenshot(filePath, threshold) {
  const png = PNG.sync.read(fs.readFileSync(filePath))
  let nonWhite = 0
  const total = png.width * png.height

  for (let i = 0; i < png.data.length; i += 4) {
    const alpha = png.data[i + 3]
    if (alpha === 0) continue

    const r = png.data[i]
    const g = png.data[i + 1]
    const b = png.data[i + 2]
    if (r < 245 || g < 245 || b < 245) {
      nonWhite += 1
    }
  }

  const nonWhiteRatio = total === 0 ? 0 : nonWhite / total
  return {
    nonWhiteRatio,
    passed: nonWhiteRatio >= threshold,
  }
}

function formatLog(value) {
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}
