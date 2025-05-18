import { ChubEntity } from '/web/store/chub'

export async function processBook(entity: ChubEntity) {
  const url = `https://api.chub.ai/api/v4/projects/${entity.id}/repository/files/raw%252Fsillytavern_raw.json/raw?ref=main&response_type=blob`

  const blob = await fetch(url, { headers: { accept: '*/*' } }).then((res) => {
    const result = res.json()
    return result
  })

  return blob
}

export async function processChar(fullPath: string) {
  const avatar = await fetch(`https://avatars.charhub.io/avatars/${fullPath}/chara_card_v2.png`, {
    headers: { accept: '*/*' },
  }).then((res) => {
    const blob = res.blob()
    return blob
  })

  const file = new File([avatar], `main_${fullPath}.png`, { type: 'image/png' })
  return file
}
