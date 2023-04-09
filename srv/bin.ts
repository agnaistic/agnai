#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2))

const options: string[] = []

const selfhost = flag(
  `Disable JSON storage mode. Browser local storage won't be used. Instead, JSON files will be managed by the server.`,
  'j',
  'json'
)

const port = flag(`Choose the port run the server on. Default: 3001`, 'p', 'port')

if (process.argv.slice(2).join(' ').includes('help')) {
  console.log('Agnaistic')
  for (const opt of options) {
    console.log(opt)
  }

  process.exit(0)
}

if (selfhost) process.env.SELF_HOST = ''

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
