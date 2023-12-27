import { TranslateAdapter, TranslateResponse } from '/srv/translate/types'
import https from 'https'

const handleTranslate: TranslateAdapter = async ({
  text,
  from,
  to,
}): Promise<TranslateResponse> => {
  const { generateRequestUrl, normaliseResponse } = require('google-translate-api-browser')

  const fromTo: { from?: string; to: string } = { to: to }

  if (from != null) {
    fromTo['from'] = from
  }

  console.log(`Google Translate, Original Text: ${text}`)

  const url = generateRequestUrl(text, fromTo)

  return new Promise<TranslateResponse>(
    (
      resolve,
      reject // return Promise
    ) => {
      https.get(url, (resp) => {
        let data = ''

        resp.on('data', (chunk) => {
          data += chunk
        })

        resp.on('end', () => {
          try {
            const result = normaliseResponse(JSON.parse(data))

            console.log(`Google Translate, Translated Text: ${result.text}`)

            resolve({ text: result.text, originalText: text, service: 'googletranslate' })
          } catch (error) {
            reject(error)
          }
        })
      }) // failure, reject
    }
  )
}

export const googleTranslateHandler = {
  translate: handleTranslate,
}
