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
import { useTransContext } from '@mbarzda/solid-i18next'

export { TiersPage as default }

const TiersPage: Component = (props) => {
  const [t] = useTransContext()

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

    return [{ label: t('no_payment_required'), value: '' }].concat(list)
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
    const items = [{ label: t('none'), value: '' }]

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
    })

    const product = admin.products.find((p) => p.id === data.productId)
    const price = admin.prices.find((p) => p.id === product?.default_price!)
    const patreonTier = admin.patreonTiers.find((t) => t.id === data.patreonTier)
    const patreon = patreonTier
      ? { tierId: patreonTier.id, cost: patreonTier.attributes.amount_cents }
      : (null as any as undefined)

    if (!product) {
      if (data.productId) {
        toastStore.error(t('cannot_submit_product_x_not_found', { product_id: data.productId }))
        return
      }
    }

    const priceId = product ? (product.default_price as string) : ''

    if (!product?.default_price && data.productId) {
      toastStore.error(
        t('cannot_submit_product_x_does_not_have_a_price', {
          product_id: data.productId,
        })
      )
      return
    }

    if (!price && data.productId) {
      toastStore.error(
        t('cannot_submit_product_price_x_not_found', { price: product?.default_price })
      )

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
    <>
      <PageHeader title="Subscription Tier" />

      <A href="/admin/subscriptions" class="link">
        {t('back_to_subscriptions')}
      </A>

      <Card>
        <form ref={form} class="flex flex-col gap-2">
          <TextInput fieldName="id" label="ID" disabled value={editing()?._id} />

          <TextInput
            fieldName="name"
            label={t('name')}
            value={editing()?.name}
            onInput={(ev) => setName(ev.currentTarget.value)}
          />

          <TextInput
            fieldName="description"
            label={t('description')}
            helperText={t('tier_description_message')}
            value={editing()?.description}
            isMultiline
            onInput={(ev) => setDesc(ev.currentTarget.value)}
          />

          <Toggle
            fieldName="apiAccess"
            label={t('api_access_capable')}
            helperText={t('api_access_capable_message')}
            value={editing()?.apiAccess ?? false}
          />

          <Toggle
            fieldName="guidanceAccess"
            label="Guidance (V2) Access Capable"
            helperText="If enabled, this tier can use GuidanceV2 if the server/preset allows it"
            value={editing()?.guidanceAccess ?? false}
          />

          <Select
            fieldName="patreonTier"
            label={t('patreon_tier')}
            helperText={t('patreon_tier_message')}
            value={editing()?.patreon?.tierId}
            items={patreonTiers()}
          />

          <div class="text-lg font-bold">{t('preview')}</div>

          <TierCard
            tier={{
              name: name(),
              description: desc(),
              cost: price(),
              disableSlots: false,
              apiAccess: false,
              guidanceAccess: false,
            }}
          />

          <Select
            fieldName="productId"
            label={t('stripe_product')}
            items={products()}
            value={editing()?.productId}
            onChange={(ev) => setProductId(ev.value)}
          />

          <TextInput
            type="number"
            fieldName="level"
            label={t('level')}
            value={editing()?.level ?? -1}
          />

          <Toggle
            fieldName="enabled"
            label={t('enabled')}
            helperText={t('tier_disabled_message')}
            value={editing()?.enabled}
          />

          <Show when={!!settings.slots.publisherId}>
            <Toggle
              fieldName="disableSlots"
              label={t('disable_slots')}
              helperText={t('disable_slots_message')}
              value={editing()?.disableSlots}
            />
          </Show>

          <div class="flex w-full justify-end">
            <Button onClick={onSubmit}>{t('save')}</Button>
          </div>
        </form>
      </Card>
    </>
  )
}
