import { Component } from 'solid-js'
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
  return (
    <TitleCard class={`flex w-1/2 flex-col gap-2 ${props.class || ''}`}>
      <div class="flex justify-center text-lg font-bold text-[var(--hl-500)]">
        {props.tier.name}
      </div>
      <div class="markdown text-sm" innerHTML={markdown.makeHtml(props.tier.description)} />
      <div class="flex justify-center text-lg font-bold">
        ${(props.tier.cost / 100).toFixed(2)}/mo
      </div>
      {props.children}
    </TitleCard>
  )
}
