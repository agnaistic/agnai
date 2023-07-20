#!/usr/bin/env node
import * as proc from 'child_process'
import * as path from 'path'
import * as os from 'os'
import { mkdirpSync } from 'mkdirp'
import { copyFileSync, readdirSync, statSync } from 'fs'
const argv = require('minimist')(process.argv.slice(2))

const pkg = require('../package.json')

const folders = getFolders()
const options: string[] = []

const disableJson = flag(
  `Disable JSON storage mode. Browser local storage will be used. Not recommended for private use.`,
  'j',
  'json'
)

const debug = flag(`Enable debug logging. This will print payloads sent to the AI`, 'd', 'debug')
const port = flag(`Choose the port to run the server on. Default: 3001`, 'p', 'port')

const all = flag('Run Agnaistic and the Pipeline API', 'a', 'all')
const pipeline = flag('Run the Pipeline API only', 'pipeline')
const tunnel = flag('Expose your Agnai server using LocalTunnel', 't', 'tunnel')

if (argv.help || argv.h) {
  help()
}

if (debug) {
  process.env.LOG_LEVEL = 'debug'
}

const jsonLocation = flag(
  `Provide a location for the JSON files folder. Defaults to: ${folders.json}`,
  'f',
  'files'
)
const assets = flag(
  `Provide a location for the assets (images) folder. Defaults to: ${folders.assets}`,
  'a',
  'assets'
)

if (jsonLocation) {
  if (typeof jsonLocation !== 'string') {
    console.error(`Error: The '-f/--files' flag was provided with no value.`)
    help(-1)
  }
  process.env.JSON_FOLDER = path.resolve(process.cwd(), jsonLocation)
} else {
  process.env.JSON_FOLDER = folders.json
}

if (assets) {
  if (typeof assets !== 'string') {
    console.error(`Error: The '-a/--assets' flag was provided with no value.`)
    help(-1)
  }
  process.env.ASSET_FOLDER = path.resolve(process.cwd(), jsonLocation)
} else {
  process.env.ASSET_FOLDER = folders.assets
}

if (!disableJson) {
  process.env.JSON_STORAGE = '1'
  process.env.SAVE_IMAGES = '1'
  process.env.IMAGE_SIZE_LIMIT = '100'
  process.env.JSON_SIZE_LIMIT = '100'
}

if (port) {
  const value = +port
  if (value > 0 && value < 65536) process.env.PORT = port
  else {
    console.error(`Invalid port supplied. Must be between 1-65535`)
    help(-1)
  }
}

function flag(desc: string, ...flags: string[]) {
  options.push(`${flags.map(toFlagName).join(' ').padEnd(12, ' ')}: ${desc}`)
  let match: any

  for (const flag of flags) {
    match = argv[flag]
    if (match !== undefined) break
  }

  return match
}

function toFlagName(flag: string) {
  return flag.length === 1 ? `-${flag}` : `--${flag}`
}

function help(code = 0) {
  console.log(`\nAgnaistic v${pkg.version}\n`)
  const sorted = options.sort((l, r) => (l[1] > r[1] ? 1 : l[1] === r[1] ? 0 : -1))
  for (const opt of sorted) {
    console.log(opt)
  }

  process.exit(code)
}

start()

async function start() {
  if (tunnel) {
    process.env.PUBLIC_TUNNEL = 'true'
  }
  const runApi = all || !pipeline
  const runPipeline = all || pipeline

  if (runPipeline) await startPipeline()
  if (runApi) require('./start')
}

function getFolders() {
  const home = path.resolve(os.homedir(), '.agnai')
  const assets = path.resolve(home, 'assets')
  const json = path.resolve(home, 'json')
  const pipeline = path.resolve(home, 'pipeline')
  const root = path.resolve(__dirname, '..')

  if (argv.files || argv.f) return { root, assets, json, pipeline }

  try {
    readdirSync(home)
  } catch (ex) {
    mkdirpSync(home)
    mkdirpSync(assets)
    mkdirpSync(json)
  }

  const oldAssets = path.resolve(root, 'dist/assets')
  const oldJson = path.resolve(root, 'db')

  const files = {
    assets: {
      old: getFileList(oldAssets),
      new: getFileList(assets),
    },
    json: {
      old: getFileList(oldJson).filter((f) => f.endsWith('.json')),
      new: getFileList(json),
    },
  }

  if (files.assets.old.length && !files.assets.new.length) {
    console.log('Copying assets to new location...')
    for (const file of files.assets.old) {
      copyFileSync(path.resolve(oldAssets, file), path.resolve(assets, file))
    }
    console.log('Assets copied.')
  }

  if (files.json.old.length && !files.json.new.length) {
    console.log('Copying JSON files to new location...')
    for (const file of files.json.old) {
      if (!file.endsWith('.json')) continue
      copyFileSync(path.resolve(oldJson, file), path.resolve(json, file))
    }
    console.log('JSON files copied.')
  }

  return { root, assets, json, pipeline }
}

function getFileList(dir: string) {
  try {
    const files = readdirSync(dir)
    return files
  } catch (ex) {
    return []
  }
}

async function startPipeline() {
  process.env.PIPELINE_PROXY = 'true'

  const pip = path.resolve(folders.pipeline, 'bin/pip')
  const poetry = path.resolve(folders.pipeline, 'bin/poetry')
  const poetryExists = fileExists(poetry)

  if (!poetryExists) {
    console.log('Installing pipeline features... This may take some time')
    await execAsync(`python3 -m venv ${folders.pipeline}`)
    await execAsync(`${pip} install poetry==1.4.1`)
  }

  console.log('Ensuring pipeline dependencies are up to date...')
  // await execAsync(`${poetry} show`)
  await execAsync(`${poetry} install --no-interaction --no-ansi`)

  console.log('Starting Pipeline API...')
  execAsync(`${poetry} run python ${folders.root}/model/app.py`)
}

async function execAsync(command: string) {
  console.log(command)
  const cmd = proc.exec(command, { cwd: folders.root })

  cmd.stdout?.on('data', console.log)
  cmd.stderr?.on('data', console.error)
  cmd.stderr?.on('error', console.error)

  return new Promise((resolve, reject) => {
    cmd.on('error', (err) => {
      console.error(err)
      reject(err)
    })

    cmd.on('exit', (code) => {
      if (code !== 0 && code !== 1) reject(code)
      else resolve(code)
    })
  })
}

function fileExists(file: string) {
  try {
    const stat = statSync(file)
    stat.isFile()
    return true
  } catch (ex) {
    return false
  }
}
