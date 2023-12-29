import extract from 'png-chunks-extract'
import text from 'png-chunk-text'
import { load as loadExif } from 'exifreader'
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

const dataExtractors: Record<string, (buffer: Buffer) => Promise<string>> = {
  // tEXt chunks
  apng: extractText,
  png: extractText,
  jpg: extractText,
  jpeg: extractText,

  // EXIF data
  webp: extractExif,
}

export async function extractCardData(file: File) {
  const ext = file.name.split('.').slice(-1)[0]
  const buffer = await getFileBuffer(file)
  if (!buffer) {
    throw Error(`Failed parsing character card image: No buffer`)
  }

  const extractor = dataExtractors[ext]
  if (!extractor) {
    throw Error('Failed parsing character card image: No known extractor')
  }
  const data = await extractor(buffer)

  try {
    return JSON.parse(data) as ImageCard
  } catch (ex: any) {
    throw new Error(`Failed parsing card data as JSON: ${ex.message}`)
  }
}

async function extractExif(buffer: Buffer): Promise<string> {
  const exif = loadExif(buffer)
  const data = exif.UserComment?.description
  if (!data) {
    throw new Error('No data found')
  }
  if (data.startsWith('{')) {
    // This is in the correct format of being a card but hasn't been processed by newer (>April 2023) Tavern versions
    return data
  } else {
    // This card has been processed by a recent version of Tavern so the data is stored as a byte array
    const bytes = new Uint8Array(data.split(',').map(Number))
    const decoder = new TextDecoder()
    return decoder.decode(bytes)
  }
}

async function extractText(buffer: Buffer): Promise<string> {
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
  return data
}
