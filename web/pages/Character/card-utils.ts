import extract from 'png-chunks-extract'
import text from 'png-chunk-text'
import { getFileBuffer } from '../../store/data/chars'

export type ImageCard = {
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

export async function extractCardData(file: File) {
  const buffer = await getFileBuffer(file)
  const extractions = extract(buffer as any)
  if (!extractions.length) {
    throw new Error('No extractions found')
  }
  const textExtractions = extractions
    .filter((d) => d.name === 'tEXt')
    .map((d) => text.decode(d.data))

  const [extracted] = textExtractions
  if (!extracted) {
    throw new Error(
      `No extractions of type tEXt found, found: ${extractions.map((e) => e.name).join(', ')}`
    )
  }

  const data = Buffer.from(extracted.text, 'base64').toString('utf-8')

  try {
    return JSON.parse(data) as ImageCard
  } catch (ex: any) {
    throw new Error(`Failed parsing tavern data as JSON: ${ex.message}`)
  }
}
