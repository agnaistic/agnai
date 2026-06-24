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
  const cfg = userStore((s) => ({ tiers: s.tiers }))
  const admin = adminStore((s) => ({
    products: s.products,
    prices: s.prices,
    patreonTiers: s.patreonTiers,
  }))
  const settings = settingStore((s) => ({ config: s.config, slots: s.slots }))

  const products = createMemo(() => {
    const list = admin.products.map((product) => {
      const price = admin.prices.find((price) => price.id === product.default_price)
      const cost = price?.unit_amount ? `$${price.unit_amount / 100}` : ''
      return {
        label: `${product.name} ${cost}`,
        value: product.id,
      }
    })

    return [{ label: '无需付款', value: '' }].concat(list)
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
    const items = [{ label: '无', value: '' }]

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
        toastStore.error(`无法提交：找不到产品“${data.productId}”`)
        return
      }
    }

    const priceId = product ? (product.default_price as string) : ''

    if (!product?.default_price && data.productId) {
      toastStore.error(`无法提交：产品“${data.productId}”没有价格`)
      return
    }

    if (!price && data.productId) {
      toastStore.error(`无法提交：找不到价格“${product?.default_price}”`)
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
      <PageHeader title="订阅层级" />

      <A href="/admin/subscriptions" class="link">
        ← 返回订阅与模型
      </A>

      <Card>
        <form ref={form} class="flex flex-col gap-2">
          <TextInput fieldName="id" label="ID" disabled value={editing()?._id} />

          <TextInput
            fieldName="name"
            label="名称"
            value={editing()?.name}
            onChange={(ev) => setName(ev.currentTarget.value)}
          />

          <TextInput
            fieldName="description"
            label="描述"
            helperText="这里会使用 Markdown 渲染器渲染，也支持 HTML。"
            value={editing()?.description}
            isMultiline
            onChange={(ev) => setDesc(ev.currentTarget.value)}
          />

          <Toggle
            fieldName="apiAccess"
            label="可使用 API 访问"
            helperText="启用后，如果服务器允许，此层级可使用 API 访问。"
            value={editing()?.apiAccess ?? false}
          />

          <Toggle
            fieldName="guidanceAccess"
            label="可使用 Guidance（V2）"
            helperText="启用后，如果服务器或预设允许，此层级可使用 GuidanceV2。"
            value={editing()?.guidanceAccess ?? false}
            classList={{ hidden: !settings.config.adapters.includes('agnaistic') }}
          />

          <Toggle
            fieldName="imagesAccess"
            label="图像生成访问"
            helperText="启用后，此层级可使用 Agnaistic 图像生成。"
            value={editing()?.imagesAccess ?? false}
            classList={{ hidden: !settings.config.adapters.includes('agnaistic') }}
          />

          <Select
            fieldName="patreonTier"
            label="Patreon 层级"
            helperText="如果已关联 Patreon，则需要满足最低层级。"
            value={editing()?.patreon?.tierId}
            items={patreonTiers()}
          />

          <div class="text-lg font-bold">预览</div>

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
            label="Stripe 产品"
            items={products()}
            value={editing()?.productId}
            onChange={(ev) => setProductId(ev.value)}
          />

          <TextInput type="number" fieldName="level" label="等级" value={editing()?.level ?? -1} />

          <Toggle
            fieldName="enabled"
            label="启用"
            helperText="禁用后，用户将无法选择此层级。"
            value={editing()?.enabled}
          />

          <Show when={!!settings.slots.publisherId}>
            <Toggle
              fieldName="disableSlots"
              label="禁用 Slots"
              helperText="此层级会阻止 Slots 渲染。"
              value={editing()?.disableSlots}
            />
          </Show>

          <div class="flex w-full justify-end">
            <Button onClick={onSubmit}>保存</Button>
          </div>
        </form>
      </Card>
    </Page>
  )
}
