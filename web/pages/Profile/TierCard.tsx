import { Component, createMemo } from 'solid-js'
import { AppSchema } from '/common/types'
import { TitleCard } from '/web/shared/Card'
import { markdown } from '/web/shared/markdown'

type TierPreview = OmitId<
  AppSchema.SubscriptionTier,
  Dates | 'enabled' | 'priceId' | 'productId' | 'level'
>

export const TierCard: Component<{ tier: TierPreview; children?: any; class?: string }> = (
  props
) => {
  const cost = createMemo(() => {
    const prices: string[] = []
    if (props.tier.cost > 0) {
      prices.push('$' + (props.tier.cost / 100).toFixed(2) + '/mo')
    }

    if (prices.length > 0) {
      return prices.join(' or ')
    }

    return 'None'
  })

  return (
    <TitleCard class={`flex w-full flex-col gap-2 sm:w-1/2 ${props.class || ''}`}>
      <div class="flex justify-center text-lg font-bold text-[var(--hl-500)]">
        {props.tier.name}
      </div>
      <div class="markdown text-sm" innerHTML={markdown.makeHtml(props.tier.description)} />
      <div class="flex justify-center text-lg font-bold">{cost()}</div>
      {props.children}
    </TitleCard>
  )
}
