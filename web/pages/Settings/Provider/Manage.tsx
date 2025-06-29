import { Component, createEffect, createMemo, createSignal, Match, Show, Switch } from 'solid-js'
import { AppSchema } from '/common/types'
import { presetStore } from '/web/store/presets'
import {
  CUSTOM_PROVIDERS,
  getSafeProviderDetail,
  KNOWN_PROVIDERS,
  KNOWN_SELF_HOST,
} from '/common/providers'
import { CustomOption, CustomSelect } from '/web/shared/CustomSelect'
import { getStore } from '/web/store/create'
import { RootModal } from '/web/shared/Modal'
import { toastStore } from '/web/store/toasts'
import { ADAPTER_LABELS, FORMAT_LABEL } from '/common/adapters'
import TextInput from '/web/shared/TextInput'
import Button from '/web/shared/Button'
import { Cable, Check, Ellipsis, X } from 'lucide-solid'
import Select from '/web/shared/Select'

export const ManageProvider: Component<{
  user: AppSchema.User | undefined
  show: boolean
  close: () => void
  provider?: AppSchema.Provider
}> = (props) => {
  const [tested, setTested] = createSignal<boolean>()
  const [loading, setLoading] = createSignal(false)
  const [name, setName] = createSignal(props.provider?.name || '')
  const [provider, setProvider] = createSignal(props.provider?.provider || '')
  const [url, setUrl] = createSignal(props.provider?.url || '')
  const [key, setKey] = createSignal('')
  const [format, setFormat] = createSignal('')

  const state = presetStore((s) => ({ testLoading: s.testLoading }))

  const isUsableProvider = (id: string) => {
    if (!props.user?.providers) return true
    if (props.provider?.provider === id) return true
    const match = props.user.providers.find((p) => p.provider === id)
    return !match
  }

  const categories = createMemo(() => {
    const known = {
      name: 'Supported Providers',
      options: Object.entries(KNOWN_PROVIDERS)
        .map(([key, info]) => ({
          label: info.name,
          value: `known-${key}`,
          disabled: !isUsableProvider(`known-${key}`),
        }))
        .sort(sortAlpha) as CustomOption[],
    }

    const self = {
      name: 'Self-Host',
      options: Object.entries(KNOWN_SELF_HOST)
        .map(([key, info]) => ({
          label: info.name,
          value: `self-${key}`,
        }))
        .sort(sortAlpha) as CustomOption[],
    }

    const custom = {
      name: 'Custom - OpenAI Compatible',
      options: Object.entries(CUSTOM_PROVIDERS)
        .map(([key, info]) => ({
          label: info.name,
          value: `custom-${key}`,
        }))
        .sort(sortAlpha) as CustomOption[],
    }

    return [known, self, custom]
  })

  createEffect(() => {
    if (!props.show) return
    setTested(undefined)
    setProvider(props.provider?.provider || '')
    setUrl(props.provider?.url || '')
    setName(props.provider?.name || '')
    setKey('')

    if (!props.provider?.provider || !props.provider.format) return

    const detail = getSafeProviderDetail(props.provider?.provider)
    if (!detail?.detail?.formats) return

    for (let idx = 0; idx < detail.detail.formats.length; idx++) {
      const fmt = detail.detail.formats[idx]

      if (fmt.type !== props.provider.format.type) continue
      if (fmt.value !== props.provider.format.value) continue
      setFormat(`${idx}`)
      break
    }
  })

  const isCustom = createMemo(() => provider().startsWith('custom-'))
  const isSelf = createMemo(() => provider().startsWith('self-'))

  const save = () => {
    setLoading(true)
    const prv = provider()
    const def = getSafeProviderDetail(prv)

    const fmt = +format()

    const body: AppSchema.Provider = {
      _id: props.provider?._id || '',
      name: name(),
      key: key(),
      provider: provider(),
      url: url(),
    }

    if (fmt >= 0 && def.detail?.formats) {
      body.format = def.detail.formats[fmt]
    }

    getStore('user').saveProvider(body, (success) => {
      setLoading(false)

      if (success) {
        props.close()
      }
    })
  }

  const onProviderChange = (id: string) => {
    setProvider(id)
    setTested(undefined)
    const detail = getSafeProviderDetail(id)

    if (detail?.detail?.url?.trim()) {
      setUrl(detail.detail?.url?.trim())
    }

    setFormat('0')
  }

  const onFormatChange = (id: string) => {
    setFormat(id)
    const detail = getSafeProviderDetail(provider())
    const index = +id

    if (index >= 0) {
      const format = detail?.detail?.formats?.[index]
      if (!format?.url) return

      setUrl(format.url.trim())
    }
  }

  const onClickDelete = () => {
    if (!props.provider?._id) return
    getStore('user').deleteProvider(props.provider._id, (success) => {
      if (!success) return
    })
  }

  const label = createMemo(() => {
    const id = provider()
    if (!id) {
      return 'Provider: Choose a Provider'
    }
    const detail = getSafeProviderDetail(id)
    return `Provider: ${detail?.detail?.name || id}`
  })

  const formatOptions = createMemo(() => {
    const prv = provider()
    const detail = getSafeProviderDetail(prv)
    const list = detail?.detail?.formats
    if (!list) {
      return []
    }

    return list.map((format, index) => {
      const label = format.name
        ? format.name
        : format.type === 'service'
        ? ADAPTER_LABELS[format.value]
        : FORMAT_LABEL[format.value]
      return { label, value: `${index}` }
    })
  })

  const testConnection = () => {
    try {
      new URL(url()) // Validate the URL
      presetStore.testConnection(
        { providerId: provider(), url: url(), key: key() },
        (success, goodUrl) => {
          if (!success) {
            setTested(false)
          }

          if (success && goodUrl) {
            setTested(true)
            setUrl(goodUrl)
          }
        }
      )
    } catch (ex) {
      toastStore.error('URL is not valid. Check it and try again')
    }
  }

  return (
    <RootModal
      show={props.show}
      close={props.close}
      title={`${props.provider?._id ? 'Update Provider' : 'Create Provider'}`}
      footer={
        <div class="flex w-full justify-between">
          <div>
            <Show when={!!props.provider?._id}>
              <Button schema="red" onClick={onClickDelete}>
                Delete
              </Button>
            </Show>
          </div>
          <div class="flex gap-2">
            <Button schema="secondary" onClick={props.close} disabled={loading()}>
              Cancel
            </Button>
            <Button schema="success" onClick={save} disabled={loading() || !provider()}>
              {props.provider?._id ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      }
    >
      <div class="text-md">Provide connection details to use an external service</div>
      <div class="flex flex-col gap-2">
        <CustomSelect
          categories={categories()}
          onSelect={(ev) => onProviderChange(ev.value)}
          buttonLabel={label()}
          selected={provider()}
        />

        <TextInput
          label="Label"
          placeholder="Custom label for this provider"
          value={name()}
          onChange={(ev) => setName(ev.currentTarget.value)}
          hide={!isCustom() && !isSelf()}
        />

        <TextInput
          label="URL"
          placeholder="https://..."
          value={url()}
          onChange={(ev) => {
            setUrl(ev.currentTarget.value)
            setTested(undefined)
          }}
          hide={!isCustom() && !isSelf()}
        />

        <TextInput
          label="API Key"
          type="password"
          placeholder={props.provider?.keySet ? 'Key is set' : 'E.g. sk-...'}
          onChange={(ev) => setKey(ev.currentTarget.value)}
          value={key()}
        />

        <Select
          items={formatOptions()}
          label="Request Format"
          value={format()}
          onChange={(ev) => onFormatChange(ev.value)}
          hide={formatOptions().length <= 1}
        />

        <Show when={isCustom()}>
          <div class="flex w-full items-center justify-center">
            <Button size="sm" onClick={testConnection} disabled={!url().trim()}>
              Test Connection
            </Button>
            <span class="pl-2">
              <Switch>
                <Match when={state.testLoading}>
                  <Ellipsis color="var(--text-600" size={20} />
                </Match>
                <Match when={tested()}>
                  <Check color="var(--green-500)" size={20} />
                </Match>
                <Match when={tested() === false}>
                  <X color="var(--red-500)" size={20} />
                </Match>
                <Match when>
                  <Cable color="var(--text-600)" size={20} />
                </Match>
              </Switch>
            </span>
          </div>
        </Show>
      </div>
    </RootModal>
  )
}

function sortAlpha(l: { label: string }, r: { label: string }) {
  return l.label.localeCompare(r.label)
}
