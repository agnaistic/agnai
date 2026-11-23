const path = require('path')
const fs = require('fs')

const inject = process.env.INJECT_SCRIPT
const sha = process.argv.slice(2)[0] || process.env.GITHUB_SHA

console.log('Injecting:', !!inject, ' | SHA: ', sha)

const tags = ['<meta inject="">', '<meta inject>', '<meta inject="" />']
const indexFile = path.resolve(__dirname, '../dist/index.html')
const outFile = path.resolve(__dirname, '../dist/index.html')

let content = fs
  .readFileSync(indexFile)
  .toString()
  .replace('{{unknown}}",', sha + '";')

if (inject) {
  for (const tag of tags) {
    if (!content.includes(tag)) continue
    content = content.replace(tag, inject)
    break
  }
}

fs.writeFileSync(outFile, content)
