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
const version = process.env.MP_VERSION || require(path.join(projectPath, 'package.json')).version || '0.0.1'
const desc = process.env.MP_DESC || 'codex upload'

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

ci.upload({
  project,
  version,
  desc,
  setting: {
    es6: true,
    minify: false,
  },
  onProgressUpdate: console.log,
}).then(() => {
  console.log(`Uploaded mini program version: ${version}`)
}).catch((error) => {
  console.error(error)
  process.exit(1)
})
