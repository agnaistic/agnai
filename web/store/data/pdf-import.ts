import * as PDFDE from 'pdfdataextract'
import * as GlobalWorkerOptions from 'pdfjs-dist/lib/display/worker_options.js'
import * as PDFWorker from 'pdfjs-dist/build/pdf.worker.entry.js'
import { getFileAsBuffer } from '/web/shared/FileInput'

GlobalWorkerOptions.workerSrc = PDFWorker

export async function extractPdf(file: File) {
  const buffer = await getFileAsBuffer(file)
  const data = await PDFDE.PdfData.extract(buffer, {})

  return data
}
