import { CHUB_URL } from '/web/store/chub'

const headers = {
  'Content-Type': 'application/json',
  accept: '/',
}

export async function processBook(fullPath: string) {
  const body = { format: 'AGNAI', fullPath, version: 'main' }
  const res = await fetch(`${CHUB_URL}/lorebooks/download`, {
    headers,
    body: JSON.stringify(body),
    method: 'post',
  })

  const json = await res.json()
  return json
}

export async function processChar(fullPath: string) {
  const body = { format: 'tavern', fullPath, version: 'main' }
  const res = await fetch(`${CHUB_URL}/characters/download`, {
    headers,
    body: JSON.stringify(body),
    method: 'post',
  })

  const blob = await res.blob()
  const file = new File([blob], `main_${fullPath}.png`, { type: 'image/png' })
  return file
}
