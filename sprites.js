const fs = require('fs')
const path = require('path')

const sprites = path.resolve('./web/asset/sprites')

const map = { attributes: {} }

const names = fs.readdirSync(sprites)

const attrs = new Map()

for (const name of names) {
  if (!name.endsWith('.png')) continue
  const [gender, attr, type, ...files] = name.split('-')
  const file = files.join('-')

  if (!map[attr]) {
    map[attr] = {}
    attrs.set(attr, new Set())
  }

  const set = attrs.get(attr)

  if (!map[attr][type]) {
    set.add(type)
    map[attr][type] = []
  }

  if (!map[attr][type].includes(file)) {
    map[attr][type].push(file)
  }
}

for (const [attr, types] of attrs.entries()) {
  map.attributes[attr] = Array.from(types.keys())
}

fs.writeFileSync(path.join(sprites, 'manifest.json'), JSON.stringify(map, null, 2))
console.log(JSON.stringify(map.attributes, null, 2))

function scan(folder) {
  const names = fs.readdirSync(folder)

  const all = []

  for (const name of names) {
    let full = path.resolve(folder, name)
    if (full.endsWith('.png')) {
      const next = full.replace(/\/[0-9]+_/g, '/')
      const [gender, kind, type] = next.split('/').slice(-4, -1)
      if (!map[gender][kind]) map[gender][kind] = {}
      if (!map[gender][kind][type]) map[gender][kind][type] = []

      const output = `${gender}-${kind}-${type}-${name}`
      const fullOutput = path.join(sprites, output)
      map[gender][kind][type].push(output)

      fs.copyFileSync(full, fullOutput)
      fs.unlinkSync(full)

      all.push(full)
      continue
    }

    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      const sub = scan(full)
      all.push(...sub)
      continue
    }
  }

  return all
}
