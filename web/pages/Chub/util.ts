import { embedImageJson } from '../Character/util'
import { debug } from '/common/debug'
import { ChubEntity } from '/web/store/chub'

export async function processBook(entity: ChubEntity) {
  const url = `https://api.chub.ai/api/v4/projects/${entity.id}/repository/files/raw%252Fsillytavern_raw.json/raw?ref=main&response_type=blob`

  const blob = await fetch(url, { headers: { accept: '*/*' } }).then((res) => {
    const result = res.json()
    return result
  })

  return blob
}

export async function processChar(fullPath: string, entity: ChubEntity) {
  const log = debug('chub')
  try {
    const avatar = await fetch(`https://avatars.charhub.io/avatars/${fullPath}/chara_card_v2.png`, {
      headers: { accept: '*/*' },
    }).then((res) => {
      if (res.status >= 400) {
        log('failed to get card')
        throw new Error(`Could not retrieve avatar, Status: ${res.status}`)
      }

      const blob = res.blob()
      return blob
    })

    const file = new File([avatar], `main_${fullPath}.png`, { type: 'image/png' })
    return file
  } catch (ex) {}

  const json = await fetch(
    `https://gateway.chub.ai/api/v4/projects/${
      entity.id
    }/repository/files/raw%252Ftavern_raw.json/raw?ref=main&response_type=blob&nocache=0.${Date.now()}`,
    { headers: { accept: '*/*' } }
  ).then((res) => res.blob())

  const jsonFile = new File([json], `main_${fullPath}.json`, { type: 'application/json' })
  if (!entity.avatar_url) {
    return jsonFile
  }

  try {
    log('building card')
    const json = await jsonFile.text()
    const embedded = await embedImageJson(entity.avatar_url, JSON.parse(json))
    const png = new File([embedded], `main_${fullPath}.png`, { type: 'image/png' })
    return png
    //     const ext = entity.avatar_url.split('.').slice(-1)[0]
    //     const avatar = await fetch(entity.avatar_url, { headers: { accept: '*/*' }})
    //       .then(res => res.blob())
    // const webp = new File([avatar], `main_${fullPath}.${ext}`)
    // const input = await getFileAsDataURL(webp)
    //     const png = await resizeImage(input, { type: 'percent', factor: 1 })
  } catch (ex: any) {
    log(`failed to build card: %s`, ex.message)
  }

  return jsonFile
}
