import { createSignal } from 'solid-js'
import { useEffect } from '../hooks'
import { altJailbreak, classifyTemplate } from '/common/templates'
import { AppSchema } from '/common/types'
import { EmoteType, FullSprite, SpriteAttr, classifyEmotes } from '/common/types/sprite'
import { toastStore } from '/web/store'
import { msgsApi } from '/web/store/data/messages'

export const Y_OFFSET = 0
export const HEIGHT = 1200 + Y_OFFSET
export const WIDTH = 1000
export const RATIO = (HEIGHT - Y_OFFSET) / WIDTH

const IS_HAIR: { [key in SpriteAttr]?: boolean } = {
  back_hair: true,
  front_hair: true,
  eye_cover_hair: true,
}

const IS_BODY: { [key in SpriteAttr]?: boolean } = {
  body: true,
}

const IS_EYES: { [key in SpriteAttr]?: boolean } = {
  eyes: true,
}

const TIMERS = {
  EMOTE: 20000,
  BLINK_INTERVAL: 15000,
  BLINK_LENGTH: 200,
}

export function useAutoExpression() {
  const [expr, setExpr] = createSignal<EmoteType | undefined>('neutral')
  const [ttl, setTtl] = createSignal(Date.now() + 1000)

  const reset = () => {
    setExpr()
  }

  const update = (emote?: EmoteType) => {
    setTtl(Date.now() + TIMERS.EMOTE)
    setExpr(emote)
  }

  const classify = async (settings: Partial<AppSchema.GenSettings>, message: string) => {
    const prompt = (
      settings.service === 'openai' ? `${altJailbreak}\n\n${classifyTemplate}` : classifyTemplate
    ).replace(`{{message}}`, message)

    await msgsApi.basicInference({ settings, prompt }, (err, resp) => {
      if (err) {
        toastStore.warn(`Could not classify message: ${err}`)
        return
      }

      if (resp) {
        const lowered = resp.trim().toLowerCase()
        const match = classifyEmotes.find((emote) => lowered.includes(emote))
        if (match) {
          console.log('Classifiation:', match)
          update(match)
        } else {
          console.warn(`Classify returned noise: ${resp}`)
        }
      }
    })
  }

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() < ttl()) return

      if (expr() === 'blink') {
        update()
        setTtl(Date.now() + TIMERS.BLINK_INTERVAL)
      } else {
        update('blink')
        setTtl(Date.now() + TIMERS.BLINK_LENGTH)
      }
    }, 100)

    return () => clearInterval(timer)
  })

  return { expr, update, classify, reset }
}

export function calcBounds(width: number, height: number) {
  if (width * RATIO < height) {
    return { rule: 'mw*R < mh', w: width, h: width * RATIO }
  }
  if (height / RATIO < width) {
    return { rule: 'mh/R < mw', w: height / RATIO, h: height }
  }

  return { rule: '?', w: width, h: height }
}

export function getAttrColor(body: FullSprite, attr: SpriteAttr) {
  const prop = getColorProp(attr)
  if (!prop) return '#0000007f'
  const value = body[prop]
  if (!value) return '#0000007f'

  return (value + '7f').slice(0, 9)
}

export function getColorProp(attr: SpriteAttr): keyof FullSprite | void {
  if (IS_BODY[attr]) return 'bodyColor'
  if (IS_EYES[attr]) return 'eyeColor'
  if (IS_HAIR[attr]) return 'hairColor'
}
