import { createEffect, createMemo, createSignal, Show } from 'solid-js'
import { getStore } from '/web/store/create'
import Button from '/web/shared/Button'
import { PlusIcon, WifiPen } from 'lucide-solid'
import Select from '/web/shared/Select'
import { RootModal } from '/web/shared/Modal'
import TextInput from '/web/shared/TextInput'
import { AppSchema } from '/common/types'
import { assertProviderDetail } from '../../../../common/providers'
import { Field } from '/web/shared/PresetSettings/Fields'
import { getUsableServices } from '/web/shared/util'
import { ADAPTER_LABELS, FORMAT_LABEL, ThirdPartyFormat } from '/common/adapters'
import { ManageProvider } from './Manage'

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
