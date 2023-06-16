const path = require('path')
const fs = require('fs')

const inject = process.env.TEST_SCRIPT

if (inject) {
  const tags = ['<meta inject="">', '<meta inject>', '<meta inject="" />']
  const indexFile = path.resolve(__dirname, '../dist/index.html')
  const outFile = path.resolve(__dirname, '../dist/outdex.html')

  for (const tag of tags) {
    const index = fs.readFileSync(indexFile).toString()
    if (index.includes(tag)) {
      fs.writeFileSync(outFile, index.replace(tag, inject))
      break
    }
  }
}
