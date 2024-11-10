import { Component, Show, createMemo } from 'solid-js'
import { AppSchema } from '/common/types'
import { SolidCard } from '/web/shared/Card'
import { markdown } from '/web/shared/markdown'
import { settingStore } from '/web/store'
import { HelpModal } from '/web/shared/Modal'
import { getSubscriptionModelLimits } from '/common/util'
import Button from '/web/shared/Button'

type TierPreview = OmitId<AppSchema.SubscriptionTier, Dates | 'enabled' | 'priceId' | 'productId'>

export const TierCard: Component<{
  tier: TierPreview
  children?: any
  class?: string
}> = (props) => {
  const settings = settingStore()

  const models = createMemo(() => {
    return settings.config.subs
      .filter((s) => props.tier.level >= s.level)
      .sort((l, r) =>
        r.level > l.level ? 1 : r.level === l.level ? l.name.localeCompare(r.name) : -1
      )
      .map((m) => {
        const level = getSubscriptionModelLimits(m.preset, props.tier.level)
        const ctx = level ? `${Math.floor(level.maxContextLength / 1000)}k` : ''
        return `| ${m.name} | ${ctx} |`
      })
      .join('\n')
  })

  const stripeCost = createMemo(() => {
    const prices: any[] = []
    if (props.tier.cost > 0) {
      const cost = (
        <div>
          ${(props.tier.cost / 100).toFixed(2)}/mo <span class="text-600 text-xs">Stripe</span>
        </div>
      )
      return cost
    }

    if (props.tier.patreon?.cost) {
      const cost = (props.tier.patreon?.cost / 100).toFixed(2)
      prices.push(`Patreon: $${cost}/mo`)
    }

    return null
  })

  const patreonCost = createMemo(() => {
    if (props.tier.patreon?.cost) {
      const cost = (
        <div>
          ${(props.tier.patreon.cost / 100).toFixed(2)}/mo{' '}
          <span class="text-600 text-xs">Patreon</span>
        </div>
      )
      return cost
    }

    return null
  })

  return (
    <SolidCard
      border
      class={`flex w-full flex-col justify-between gap-0.5 sm:w-1/2 ${props.class || ''}`}
      title={props.tier.name}
      size="sm"
    >
      <div>
        <div class="markdown text-sm" innerHTML={markdown.makeHtml(props.tier.description)} />
      </div>
      <div>
        <Show when={models().length > 0}>
          <HelpModal
            title={`Models on ${props.tier.name}`}
            cta={
              <div class="flex justify-center">
                <Button size="sm">View Models</Button>
              </div>
            }
          >
            <div
              class="markdown text-sm"
              innerHTML={markdown.makeHtml(`| Model | Context |\n| ----- | ------- |\n${models()}`)}
            />
          </HelpModal>
        </Show>
        <div class="text-md flex flex-col items-center font-bold">
          {stripeCost()}
          <Show when={props.tier.cost > 0 && !!props.tier.patreon?.cost}>
            <div class="text-xs">or</div>
          </Show>
          {patreonCost()}
        </div>
        {props.children}
      </div>
    </SolidCard>
  )
}
