const fs = require('fs')
const path = require('path')
const dns = require('dns')
const ci = require('miniprogram-ci')

dns.setDefaultResultOrder('ipv4first')

const projectPath = process.cwd()
const configPath = path.join(projectPath, 'project.config.json')
const projectConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))

const appid = process.env.MP_APPID || projectConfig.appid
const privateKeyPath = process.env.MP_PRIVATE_KEY_PATH || path.join(projectPath, '.private/private.key')
const pagePath = process.env.MP_PAGE || ''
const searchQuery = process.env.MP_QUERY || ''
const qrcodeOutputDest = process.env.MP_QRCODE_OUTPUT || path.join(projectPath, 'preview-qrcode.jpg')

if (!appid) {
  throw new Error('Missing appid. Set MP_APPID or add appid to project.config.json.')
}

if (!fs.existsSync(privateKeyPath)) {
  throw new Error(`Missing private key: ${privateKeyPath}`)
}

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath,
  privateKeyPath,
  ignores: ['node_modules/**/*'],
})

ci.preview({
  project,
  desc: process.env.MP_DESC || 'local preview',
  setting: {
    es6: true,
    minify: false,
  },
  qrcodeFormat: 'image',
  qrcodeOutputDest,
  pagePath,
  searchQuery,
  onProgressUpdate: console.log,
}).then(() => {
  console.log(`Preview QR code generated: ${qrcodeOutputDest}`)
}).catch((error) => {
  console.error(error)
  process.exit(1)
})
