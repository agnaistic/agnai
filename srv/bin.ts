#!/usr/bin/env node
const path = require('path')
const argv = require('minimist')(process.argv.slice(2))

const base = path.resolve(__dirname, '..')
const assetFolder = path.resolve(base, 'dist/assets')
const jsonFolder = path.resolve(base, 'db')
const pkg = require('../package.json')

const options: string[] = []

const disableJson = flag(
  `Disable JSON storage mode. Browser local storage won't be used. Instead, JSON files will be managed by the server.`,
  'j',
  'json'
)

const assets = flag(
  `Provide a location for the assets (images) folder. Defaults to: ${assetFolder}`,
  'a',
  'assets'
)

const files = flag(
  `Provide a location for the JSON files folder. Defaults to: ${jsonFolder}`,
  'f',
  'files'
)

const port = flag(`Choose the port to run the server on. Default: 3001`, 'p', 'port')

if (process.argv.slice(2).join(' ').includes('help')) {
  console.log(`\nAgnaistic v${pkg.version}\n`)
  const sorted = options.sort((l, r) => (l[1] > r[1] ? 1 : l[1] === r[1] ? 0 : -1))
  for (const opt of sorted) {
    console.log(opt)
  }

  process.exit(0)
}

if (!disableJson) process.env.JSON_STORAGE = '1'

if (port) {
  const value = +port
  if (value > 0 && value < 65536) process.env.PORT = port
  else {
    console.error(`Invalid port supplied. Must be between 1-65535`)
    process.exit(-1)
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

require('./start')
