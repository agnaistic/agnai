import { A, useParams } from '@solidjs/router'
import { Component, Show, createEffect, createMemo, on, onMount } from 'solid-js'
import { adminStore, settingStore, toastStore, userStore } from '/web/store'
import PageHeader from '/web/shared/PageHeader'
import TextInput from '/web/shared/TextInput'
import { Toggle } from '/web/shared/Toggle'
import { Card } from '/web/shared/Card'
import Button from '/web/shared/Button'
import Select from '/web/shared/Select'
import { TierCard } from '../Profile/TierCard'
import { Page } from '/web/Layout'
import { createStore } from 'solid-js/store'

export { TiersPage as default }

const TiersPage: Component = (props) => {
  const params = useParams()
  const cfg = userStore((s) => ({ tiers: s.tiers }))
  const admin = adminStore((s) => ({
    products: s.products,
    prices: s.prices,
    patreonTiers: s.patreonTiers,
  }))
  const settings = settingStore((s) => ({ config: s.config, slots: s.slots }))

  const [state, setState] = createStore({
    _id: '',
    name: '',
    description: '',
    level: 0,
    productId: '',
    enabled: true,
    disableSlots: true,
    apiAccess: true,
    patreonTier: '',
    guidanceAccess: false,
    imagesAccess: true,
  })

  createEffect(
    on(
      () => params.id,
      () => {
        if (!params.id) return
        const tier = cfg.tiers.find((t) => t._id === params.id)
        if (!tier) return
        setState({ ...tier, patreonTier: tier.patreon?.tierId || '' })
      }
    )
  )

  const products = createMemo(() => {
    const list = admin.products.map((product) => {
      const price = admin.prices.find((price) => price.id === product.default_price)
      const cost = price?.unit_amount ? `$${price.unit_amount / 100}` : ''
      return {
        label: `${product.name} ${cost}`,
        value: product.id,
      }
    })

    return [{ label: 'No payment required', value: '' }].concat(list)
  })

  const price = createMemo(() => {
    const product = admin.products.find((p) => p.id === state.productId)
    if (!product) return 0

    const price = admin.prices.find((pr) => pr.id === product.default_price)
    return price?.unit_amount || 0
  })

  const patreonTiers = createMemo(() => {
    const items = [{ label: 'None', value: '' }]

    for (const tier of admin.patreonTiers) {
      items.push({
        label: `$${(tier.attributes.amount_cents / 100).toFixed(2)} ${tier.attributes.title}`,
        value: tier.id,
      })
    }

    return items
  })

  const onSubmit = () => {
    const product = admin.products.find((p) => p.id === state.productId)
    const price = admin.prices.find((p) => p.id === product?.default_price!)
    const patreonTier = admin.patreonTiers.find((t) => t.id === state.patreonTier)
    const patreon = patreonTier
      ? { tierId: patreonTier.id, cost: patreonTier.attributes.amount_cents }
      : (null as any as undefined)

    if (!product) {
      if (state.productId) {
        toastStore.error(`Cannot submit: Product "${state.productId}" not found`)
        return
      }
    }

    const priceId = product ? (product.default_price as string) : ''

    if (!product?.default_price && state.productId) {
      toastStore.error(`Cannot submit: Product "${state.productId}" does not have a price`)
      return
    }

    if (!price && state.productId) {
      toastStore.error(`Cannot submit: Price "${product?.default_price}" not found`)
      return
    }

    const id = state._id

    const tier = {
      ...state,
      name: state.name,
      description: state.description,
      level: state.level,
      productId: state.productId,
      enabled: state.enabled,
      cost: price ? price.unit_amount! : 0,
      patreon,
      priceId,
    }

    if (id) {
      adminStore.updateTier(id, tier)
    } else {
      adminStore.createTier(tier, (tier) =>
        setState({ ...tier, patreonTier: tier.patreon?.tierId || '' })
      )
    }
  }

  onMount(() => {
    adminStore.getProducts()
    userStore.getTiers()
  })

  return (
    <Page>
      <PageHeader title="Subscription Tier" />

      <A href="/admin/subscriptions" class="link">
        ← Back to Subscriptions
      </A>

      <Card>
        <div class="flex flex-col gap-2">
          <TextInput fieldName="id" label="ID" disabled value={state._id} />

          <TextInput
            fieldName="name"
            label="Name"
            value={state.name}
            onChange={(ev) => setState('name', ev.currentTarget.value)}
          />

          <TextInput
            fieldName="description"
            label="Description"
            helperText="This is be rendered using the markdown renderer. HTML is also supported here."
            value={state.description}
            isMultiline
            onChange={(ev) => setState('description', ev.currentTarget.value)}
          />

          <Toggle
            fieldName="apiAccess"
            label="API Access Capable"
            helperText="If enabled, this tier can use API access if the server allows it"
            value={state.apiAccess ?? false}
            onChange={(ev) => setState('apiAccess', ev)}
          />

          <Toggle
            fieldName="guidanceAccess"
            label="Guidance (V2) Access Capable"
            helperText="If enabled, this tier can use GuidanceV2 if the server/preset allows it"
            value={state.guidanceAccess ?? false}
            classList={{ hidden: !settings.config.adapters.includes('agnaistic') }}
            onChange={(ev) => setState('guidanceAccess', ev)}
          />

          <Toggle
            fieldName="imagesAccess"
            label="Image Generation Access"
            helperText="If enabled, this tier can use Agnaistic Image Generation"
            value={state.imagesAccess ?? false}
            classList={{ hidden: !settings.config.adapters.includes('agnaistic') }}
            onChange={(ev) => setState('imagesAccess', ev)}
          />

          <Select
            fieldName="patreonTier"
            label="Patreon Tier"
            helperText="If Patreon is linked, the minimum tier is required"
            value={state.patreonTier}
            items={patreonTiers()}
            onChange={(ev) => setState('patreonTier', ev.value)}
          />

          <div class="text-lg font-bold">Preview</div>

          <TierCard
            tier={{
              name: state.name,
              description: state.description,
              cost: price(),
              disableSlots: false,
              apiAccess: false,
              guidanceAccess: false,
              imagesAccess: false,
              level: Infinity,
            }}
          />

          <Select
            fieldName="productId"
            label="Stripe Product"
            items={products()}
            value={state.productId}
            onChange={(ev) => setState('productId', ev.value)}
          />

          <TextInput type="number" fieldName="level" label="Level" value={state.level ?? -1} />

          <Toggle
            fieldName="enabled"
            label="Enabled"
            helperText="If disabled, this tier will not be available to users for selection."
            value={state.enabled}
            onChange={(ev) => setState('enabled', ev)}
          />

          <Show when={!!settings.slots.publisherId}>
            <Toggle
              fieldName="disableSlots"
              label="Disable Slots"
              helperText="This tier will prevent slots from rendering"
              value={state.disableSlots}
              onChange={(ev) => setState('disableSlots', ev)}
            />
          </Show>

          <div class="flex w-full justify-end">
            <Button onClick={onSubmit}>Save</Button>
          </div>
        </div>
      </Card>
    </Page>
  )
}
