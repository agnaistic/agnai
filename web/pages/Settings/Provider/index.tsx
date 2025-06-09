import { Component, createEffect, createMemo, createSignal, Show } from 'solid-js'
import { getStore } from '/web/store/create'
import Button from '/web/shared/Button'
import { PlusIcon, WifiPen } from 'lucide-solid'
import Select from '/web/shared/Select'
import { RootModal } from '/web/shared/Modal'
import { CustomOption, CustomSelect } from '/web/shared/CustomSelect'
import TextInput from '/web/shared/TextInput'
import { AppSchema } from '/common/types'
import {
  assertProviderDetail,
  CUSTOM_PROVIDERS,
  getSafeProviderDetail,
  KNOWN_PROVIDERS,
  KNOWN_SELF_HOST,
} from '../../../../common/providers'
import { Field } from '/web/shared/PresetSettings/Fields'
import { getUsableServices } from '/web/shared/util'
import { ADAPTER_LABELS, FORMAT_LABEL, ThirdPartyFormat } from '/common/adapters'

export const PresetProvider: Field = (props) => {
  const state = getStore('user')((s) => ({ user: s.user, providers: s.user?.providers || [] }))

  const [open, setOpen] = createSignal(false)
  const [openLegacy, setOpenLegacy] = createSignal(false)
  const [editing, setEditing] = createSignal<AppSchema.Provider>()

  const showEdit = createMemo(
    () => !!props.state.providerId && props.state.providerId !== 'agnaistic'
  )

  const selectedProvider = createMemo(() => {
    if (!props.state.providerId || props.state.providerId === 'agnaistic') return
    const match = state.providers.find((p) => p._id === props.state.providerId)
    return match
  })

  const services = createMemo(() => {
    const providers = state.providers.map((p) => {
      const detail = assertProviderDetail(p.provider)
      if (detail.category === 'custom') {
        if (p.name) return { label: `Custom - ${p.name}`, value: p._id }
        const hostname = tryGetHostname(p.url)
        return { label: `Custom - ${hostname}`, value: p._id }
      }

      if (detail.category === 'known') {
        return { label: 'Provider - ' + detail.detail.name, value: p._id }
      }

      return { label: `Local - ${p.name || detail?.detail?.name || p.provider} `, value: p._id }
    })

    providers.sort(sortAlpha)

    const list = getUsableServices()
    const subs = list.some((l) => l === 'agnaistic')

    if (subs) {
      providers.unshift({ label: 'Agnaistic', value: 'agnaistic' })
    }

    const label = [
      ADAPTER_LABELS[props.state.service!] || '',
      props.state.service === 'kobold' ? FORMAT_LABEL[props.state.thirdPartyFormat!] || '' : '',
    ]
      .filter((v) => !!v)
      .join('/')

    if (props.state.service !== 'agnaistic') {
      providers.push({ label: 'Legacy: ' + label, value: '' })
    }

    return providers
  })

  const editProvider = (ev: any) => {
    ev?.preventDefault?.()
    setEditing(selectedProvider())
    setOpen(true)
  }

  const newProvider = () => {
    setEditing()
    setOpen(true)
  }

  const changeProvider = (id: string) => {
    props.setter('providerId', id)

    if (props.page !== 'mode') {
      return
    }

    getStore('presets').updatePreset(
      props.state._id,
      { providerId: id },
      {
        onSuccess: () => {
          getStore('toasts').success('Provider changed')
          getStore('presets').getPresetModelList(props.state, state.providers, true)
        },
        quiet: true,
      }
    )
  }

  const editLegacy = (ev: any) => {
    ev?.preventDefault?.()
    setOpenLegacy(true)
  }

  return (
    <>
      <div class="flex flex-col gap-1">
        <Select
          label={
            <div class="flex w-full items-center justify-between pb-1">
              <div>Service</div>
              <div class="flex gap-1">
                <Button size="sm" onClick={newProvider}>
                  <PlusIcon size={16} />
                  Provider
                </Button>
              </div>
            </div>
          }
          items={services()}
          value={
            props.state.providerId === '' && props.state.service === 'agnaistic'
              ? 'agnaistic'
              : props.state.providerId
          }
          onChange={(ev) => changeProvider(ev.value)}
        >
          <Show when={props.state.providerId === ''}>
            <button class="icon-button" onClick={editLegacy}>
              <WifiPen size={16} />
            </button>
          </Show>

          <Show when={showEdit()}>
            <button class="icon-button" onClick={editProvider}>
              <WifiPen size={16} />
            </button>
          </Show>
        </Select>
      </div>
      <ManageProvider
        user={state.user}
        show={open()}
        close={() => setOpen(false)}
        provider={editing()}
      />
      <EditConnectionDetails {...props} show={openLegacy()} close={() => setOpenLegacy(false)} />
    </>
  )
}

const EditConnectionDetails: Field<{ show: boolean; close: () => void }> = (props) => {
  const services = createMemo(() => {
    const list = getUsableServices().map((adp) => ({ value: adp, label: ADAPTER_LABELS[adp] }))
    return list
  })

  // Originals
  const [url, setUrl] = createSignal('')
  const [key, setKey] = createSignal('')

  createEffect(() => {
    if (!props.show) return
    setUrl(props.state.thirdPartyUrl || '')
    setKey(props.state.thirdPartyKey || '')
  })

  const cancel = () => {
    props.setter({ thirdPartyUrl: url(), thirdPartyKey: key() })
    props.close()
  }

  const accept = () => {
    props.close()
  }

  const thirdPartyFormats = createMemo(() => {
    const formats: ThirdPartyFormat[] = [
      'kobold',
      'openai',
      'openai-chatv2',
      'openai-chat',
      'claude',
      'ooba',
      'llamacpp',
      'ollama',
      'vllm',
      'aphrodite',
      'exllamav2',
      'koboldcpp',
      'tabby',
      'mistral',
      'featherless',
      'arli',
      'gemini',
    ]

    const options = formats.map((id) => ({ label: FORMAT_LABEL[id], value: id as string }))
    options.unshift({ label: 'None', value: '' })
    return options
  })

  return (
    <RootModal
      show={props.show}
      close={props.close}
      title="Edit Connection Details"
      footer={
        <>
          <Button schema="secondary" onClick={cancel}>
            Cancel
          </Button>
          <Button schema="primary" onClick={accept}>
            Accept
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-2">
        <Select
          fieldName="service"
          label="AI Service"
          helperText={
            <>
              <Show when={!props.state.service}>
                <p class="text-red-500">
                  Warning! Your preset does not currently have a service set.
                </p>
              </Show>
            </>
          }
          value={props.state.service}
          items={services()}
          onChange={(ev) => props.setter('service', ev.value as any)}
          // disabled={props.disabled || props.disableService}
        />

        <Select
          fieldName="thirdPartyFormat"
          label="Third-Party Format"
          helperText="Controls how requests are sent"
          items={thirdPartyFormats()}
          value={props.state.thirdPartyFormat}
          hide={props.state.service !== 'kobold'}
          onChange={(ev) => props.setter('thirdPartyFormat', ev.value as ThirdPartyFormat)}
        />

        <ThirdPartyUrl {...props} />
        <ThirdPartyKey {...props} />
      </div>
    </RootModal>
  )
}

const ThirdPartyUrl: Field = (props) => {
  return (
    <TextInput
      fieldName="thirdPartyUrl"
      label="URL"
      helperMarkdown="API URL for **third-party** or **self-hosted** services"
      placeholder="E.g. https://some-tunnel-url.loca.lt"
      value={props.state.thirdPartyUrl || ''}
      disabled={props.state.disabled}
      hide={
        props.hides.thirdPartyUrl ||
        props.state.thirdPartyFormat === 'featherless' ||
        props.state.thirdPartyFormat === 'mistral' ||
        props.state.thirdPartyFormat === 'gemini' ||
        props.state.thirdPartyFormat === 'arli'
      }
      onChange={(ev) => props.setter('thirdPartyUrl', ev.currentTarget.value)}
    />
  )
}

const ThirdPartyKey: Field = (props) => {
  return (
    <>
      <TextInput
        fieldName="thirdPartyKey"
        label={
          <div class="mt-1 flex items-center gap-4">
            <div>API Key</div>
            <Show when={props.state._id}>
              <Button
                size="pill"
                onClick={() => getStore('presets').deleteUserPresetKey(props.state._id!)}
              >
                Remove Key
              </Button>
            </Show>
          </div>
        }
        helperText="Never enter your official OpenAI, Claude, Mistral keys here."
        value={props.state.thirdPartyKey}
        disabled={props.state.disabled}
        type="password"
        placeholder={props.state.thirdPartyKeySet ? 'Key is set' : 'E.g. sk-...'}
        // hide={props.hides.thirdPartyKey}
        onChange={(ev) => props.setter('thirdPartyKey', ev.currentTarget.value)}
      />
    </>
  )
}

const ManageProvider: Component<{
  user: AppSchema.User | undefined
  show: boolean
  close: () => void
  provider?: AppSchema.Provider
}> = (props) => {
  const [loading, setLoading] = createSignal(false)
  const [name, setName] = createSignal(props.provider?.name || '')
  const [provider, setProvider] = createSignal(props.provider?.provider || '')
  const [url, setUrl] = createSignal(props.provider?.url || '')
  const [key, setKey] = createSignal('')
  const [format, setFormat] = createSignal('')

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
    const detail = getSafeProviderDetail(id)

    if (detail?.detail.url?.trim()) {
      setUrl(detail.detail.url?.trim())
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
          onChange={(ev) => setUrl(ev.currentTarget.value)}
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
      </div>
    </RootModal>
  )
}

function sortAlpha(l: { label: string }, r: { label: string }) {
  return l.label.localeCompare(r.label)
}

function tryGetHostname(url: string) {
  if (!url.trim()) return 'Untitled'

  try {
    return new URL(url).host
  } catch (ex) {
    return 'Untitled (Invalid URL)'
  }
}
