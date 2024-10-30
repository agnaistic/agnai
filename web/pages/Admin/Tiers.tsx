import { A, useParams } from '@solidjs/router'
import { Component, Show, createMemo, createSignal, onMount } from 'solid-js'
import { adminStore, settingStore, toastStore, userStore } from '/web/store'
import PageHeader from '/web/shared/PageHeader'
import TextInput from '/web/shared/TextInput'
import { Toggle } from '/web/shared/Toggle'
import { Card } from '/web/shared/Card'
import { getStrictForm } from '/web/shared/util'
import Button from '/web/shared/Button'
import Select from '/web/shared/Select'
import { TierCard } from '../Profile/TierCard'
import { Page } from '/web/Layout'

export { TiersPage as default }

const TiersPage: Component = (props) => {
  let form: any
  const params = useParams()
  const cfg = userStore()
  const admin = adminStore()
  const settings = settingStore()

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

  const [editing, setEditing] = createSignal(
    params.id ? cfg.tiers.find((t) => t._id === params.id) : undefined
  )
  const [name, setName] = createSignal(editing()?.name || '')
  const [desc, setDesc] = createSignal(editing()?.description || '')
  const [productId, setProductId] = createSignal(editing()?.productId)

  const price = createMemo(() => {
    const product = admin.products.find((p) => p.id === productId())
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
    const data = getStrictForm(form, {
      name: 'string',
      description: 'string',
      level: 'number',
      productId: 'string',
      enabled: 'boolean',
      disableSlots: 'boolean?',
      apiAccess: 'boolean',
      patreonTier: 'string',
      guidanceAccess: 'boolean',
      imagesAccess: 'boolean',
    })

    const product = admin.products.find((p) => p.id === data.productId)
    const price = admin.prices.find((p) => p.id === product?.default_price!)
    const patreonTier = admin.patreonTiers.find((t) => t.id === data.patreonTier)
    const patreon = patreonTier
      ? { tierId: patreonTier.id, cost: patreonTier.attributes.amount_cents }
      : (null as any as undefined)

    if (!product) {
      if (data.productId) {
        toastStore.error(`Cannot submit: Product "${data.productId}" not found`)
        return
      }
    }

    const priceId = product ? (product.default_price as string) : ''

    if (!product?.default_price && data.productId) {
      toastStore.error(`Cannot submit: Product "${data.productId}" does not have a price`)
      return
    }

    if (!price && data.productId) {
      toastStore.error(`Cannot submit: Price "${product?.default_price}" not found`)
      return
    }

    const id = editing()?._id

    const tier = {
      ...data,
      name: data.name,
      description: data.description,
      level: data.level,
      productId: data.productId,
      enabled: data.enabled,
      cost: price ? price.unit_amount! : 0,
      patreon,
      priceId,
    }

    if (id) {
      adminStore.updateTier(id, tier)
    } else {
      adminStore.createTier(tier, (tier) => setEditing(tier))
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
        <form ref={form} class="flex flex-col gap-2">
          <TextInput fieldName="id" label="ID" disabled value={editing()?._id} />

          <TextInput
            fieldName="name"
            label="Name"
            value={editing()?.name}
            onChange={(ev) => setName(ev.currentTarget.value)}
          />

          <TextInput
            fieldName="description"
            label="Description"
            helperText="This is be rendered using the markdown renderer. HTML is also supported here."
            value={editing()?.description}
            isMultiline
            onChange={(ev) => setDesc(ev.currentTarget.value)}
          />

          <Toggle
            fieldName="apiAccess"
            label="API Access Capable"
            helperText="If enabled, this tier can use API access if the server allows it"
            value={editing()?.apiAccess ?? false}
          />

          <Toggle
            fieldName="guidanceAccess"
            label="Guidance (V2) Access Capable"
            helperText="If enabled, this tier can use GuidanceV2 if the server/preset allows it"
            value={editing()?.guidanceAccess ?? false}
            classList={{ hidden: !settings.config.adapters.includes('agnaistic') }}
          />

          <Toggle
            fieldName="imagesAccess"
            label="Image Generation Access"
            helperText="If enabled, this tier can use Agnaistic Image Generation"
            value={editing()?.imagesAccess ?? false}
            classList={{ hidden: !settings.config.adapters.includes('agnaistic') }}
          />

          <Select
            fieldName="patreonTier"
            label="Patreon Tier"
            helperText="If Patreon is linked, the minimum tier is required"
            value={editing()?.patreon?.tierId}
            items={patreonTiers()}
          />

          <div class="text-lg font-bold">Preview</div>

          <TierCard
            tier={{
              name: name(),
              description: desc(),
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
            value={editing()?.productId}
            onChange={(ev) => setProductId(ev.value)}
          />

          <TextInput type="number" fieldName="level" label="Level" value={editing()?.level ?? -1} />

          <Toggle
            fieldName="enabled"
            label="Enabled"
            helperText="If disabled, this tier will not be available to users for selection."
            value={editing()?.enabled}
          />

          <Show when={!!settings.slots.publisherId}>
            <Toggle
              fieldName="disableSlots"
              label="Disable Slots"
              helperText="This tier will prevent slots from rendering"
              value={editing()?.disableSlots}
            />
          </Show>

          <div class="flex w-full justify-end">
            <Button onClick={onSubmit}>Save</Button>
          </div>
        </form>
      </Card>
    </Page>
  )
}
