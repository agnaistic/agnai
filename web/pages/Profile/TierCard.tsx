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
    if (props.tier.cost > 0) return '$' + (props.tier.cost / 100).toFixed(2) + '/mo'
    return 'None'
  })
  return (
    <TitleCard class={`flex w-1/2 flex-col gap-2 ${props.class || ''}`}>
      <div class="flex justify-center text-lg font-bold text-[var(--hl-500)]">
        {props.tier.name}
      </div>
      <div class="markdown text-sm" innerHTML={markdown.makeHtml(props.tier.description)} />
      <div class="flex justify-center text-lg font-bold">{cost()}</div>
      {props.children}
    </TitleCard>
  )
}
