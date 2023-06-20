const fs = require('fs')
const path = require('path')
const pkgFile = path.resolve(__dirname, '../package.json')
const pkg = require(pkgFile)
const { execSync } = require('child_process')

/**
 * The base version that will be revved is taken from the published version of the package on GitHub packages.
 * If there is no package, the package.json:version will be used as the base version.
 *
 * Format: node pkg-version.js [folder] [bump?]
 *
 * Examples:
 *
 * Bump major version:
 * node pkg-version.js packages/api major
 *
 * Custom named release candidate version:
 * SHA=custom node pkg-version.js packages/common
 */

/**
 * If the 'bump' parameter is not passed, we will use the current commit SHA
 * as a "release candidate" version. E.g., 4.0.0-a1b2c3d4e5
 *
 * If 'bump' is 'major' | 'minor' | 'patch' we will publish a regular version.
 * E.g., 5.0.0
 *
 * Optionally, we can create a named release candidate version by providing the
 * SHA environment variable
 */

const bump = process.argv[2] || 'patch'
const shouldBump = !!bump && ['major', 'minor', 'patch'].includes(bump)
const suffix = shouldBump ? '' : `-${bump.slice(0, 9)}`

let error

try {
  const latest = getCurrent()

  const [version, label] = latest.split('-')
  let [major, minor, patch] = version.split('.').map((val) => Number(val))

  switch (bump) {
    case 'major':
      major++
      break

    case 'minor':
      minor++
      break

    case 'patch':
      patch++
      break
  }

  const bumpTo = `${major}.${minor}.${patch}${suffix}`

  console.log(bumpTo)
  const next = { ...pkg, version: bumpTo }
  fs.writeFileSync(pkgFile, JSON.stringify(next, null, 2))
} catch (ex) {
  error = ex
} finally {
  if (error) {
    throw error
  }

  process.exit(0)
}

function getCurrent() {
  const opts = { stdio: 'ignore' }

  try {
    const result = JSON.parse(execSync(`npm view ${pkg.name} --json`).toString())
    return result['dist-tags'].latest
  } catch (ex) {
    return pkg.version
  }
}
