import * as PDFDE from 'pdfdataextract'
import { GlobalWorkerOptions } from 'pdfjs-dist'
// @ts-ignore
import pdfWorkerSrc from 'url:pdfjs-dist/build/pdf.worker.mjs'
import { getFileAsBuffer } from '/web/shared/FileInput'

GlobalWorkerOptions.workerSrc = pdfWorkerSrc

export async function extractPdf(file: File) {
  const buffer = await getFileAsBuffer(file)
  const data = await PDFDE.PdfData.extract(buffer as any, {})

  return data
}
