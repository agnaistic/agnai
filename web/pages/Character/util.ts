import extract from 'png-chunks-extract'
import text from 'png-chunk-text'
import { getImageBuffer } from '../../store/data/chars'

export type TavernCard = {
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
  metadata?: {
    version: number
    created: number
    modified: number
    tool?: {
      name: string
      version: string
      url: string
    }
  }
}

export async function extractTavernData(file: File) {
  const buffer = await getImageBuffer(file)
  const extractions = extract(buffer as any)
    .filter((d) => d.name === 'tEXt')
    .map((d) => text.decode(d.data))

  const [extracted] = extractions
  if (!extracted) return

  const data = Buffer.from(extracted.text, 'base64').toString('utf-8')

  try {
    return JSON.parse(data) as TavernCard
  } catch (ex) {
    return
  }
}
