import { Component, createEffect, createMemo, createSignal, on, Show } from 'solid-js'
import { getStore } from '/web/store/create'
import Button from '/web/shared/Button'
import { Info, PlusIcon, WifiPen } from 'lucide-solid'
import Select from '/web/shared/Select'
import { HelpModal, RootModal } from '/web/shared/Modal'
import TextInput from '/web/shared/TextInput'
import { AppSchema } from '/common/types'
import { Field } from '/web/shared/PresetSettings/Fields'
import { ComponentSubscriber, createEmitter, useUsableServices } from '/web/shared/util'
import { ADAPTER_LABELS, FORMAT_LABEL, ThirdPartyFormat } from '/common/adapters'
import { ManageProvider } from './Manage'
import { markdown } from '/web/shared/markdown'
import { CustomSelect } from '/web/shared/CustomSelect'
import { PresetFuncs, PresetState } from '/web/store/preset-context'
import { useProviderList } from './hooks'

export const PresetProvider: Component<{
  state: PresetState
  setters: PresetFuncs
  page?: string
  openSub?: ComponentSubscriber<'open'>
}> = (props) => {
  const state = getStore('user')((s) => ({ user: s.user, providers: s.user?.providers || [] }))

  const [providers] = useProviderList()
  const [open, setOpen] = createSignal(false)
  const [openLegacy, setOpenLegacy] = createSignal(false)
  const [editing, setEditing] = createSignal<AppSchema.Provider>()

  const showEdit = createMemo(() => {
    if (props.state.providerId === 'agnaistic') return false
    if (!props.state.providerId && props.state.service === 'agnaistic') return false
    return true
  })

  const selectedProvider = createMemo(() => {
    if (!props.state.providerId || props.state.providerId === 'agnaistic') return
    const match = state.providers.find((p) => p._id === props.state.providerId)
    return match
  })

  const services = createMemo(() => {
    const list = providers()

    const label = [
      ADAPTER_LABELS[props.state.service!] || '',
      props.state.service === 'kobold' ? FORMAT_LABEL[props.state.thirdPartyFormat!] || '' : '',
    ]
      .filter((v) => !!v)
      .join('/')

    if (props.state.service !== 'agnaistic') {
      list.push({ label: 'Legacy: ' + label, value: '' })
    }

    return list
  })

  // If a provider is deleted, the props.state.providerId may still refer to it
  // Soft-set the providerId to 'legacy', or maybe the first provider in the list?
  createEffect(
    on(
      () => `${props.state.providerId} ${state.user?.providers?.length}`,
      () => {
        if (!props.state.providerId || props.state.providerId === 'agnaistic') return
        if (!state.user?.providers) return

        // However we need to deal with the race condition of receiving a new provider
        const exists = state.user.providers.find((p) => p._id === props.state.providerId)
        if (exists) return

        props.setters.setState('providerId', '')
      }
    )
  )

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
    props.setters.setState('providerId', id)

    props.setters.refreshModels()

    if (props.page !== 'mode' && props.page !== 'menu') {
      return
    }

    props.setters.update(
      { providerId: id },
      {
        quiet: true,
        onSuccess: () => {
          getStore('toasts').success('Provider changed')
        },
      }
    )
  }

  const editLegacy = (ev: any) => {
    ev?.preventDefault?.()
    setOpenLegacy(true)
  }

  createEffect(
    on(
      () => state.user?.providers,
      () => {
        const providers = state.user?.providers
        const current = editing()
        if (!providers || !current?._id) return

        const next = providers.find((p) => p._id === current._id)
        setEditing(next)
      }
    )
  )

  const label = createMemo(() => {
    const id =
      props.state.providerId === '' && props.state.service === 'agnaistic'
        ? 'agnaistic'
        : props.state.providerId
    if (id === 'agnaistic') return `Agnaistic`

    const match = services().find((s) => s.value === id)
    return match?.label || '???'
  })

  const emitter = createEmitter('close')

  return (
    <>
      <div class="flex items-end gap-1">
        <CustomSelect
          modalTitle="Select Provider"
          size="sm"
          label={
            <>
              <Show when={props.page === 'mode'}>
                <div class="flex w-full items-center gap-2 pb-1">
                  <div>Service</div>
                  <HelpModal
                    title="Providers"
                    cta={
                      <button class="icon-button flex gap-1">
                        <Info size={16} />
                      </button>
                    }
                  >
                    <div class="flex flex-col gap-3">
                      <p>Providers are used to connect to your preferred AI models.</p>
                      <Markdown
                        text={`Click **\`+ New\`** to create a new provider and fill in the information.`}
                      />
                      <Markdown
                        text={`**Format**\nIf you prompted to select a **Format** and you are not sure one to use, select \`Chat\`.`}
                      />
                      <Markdown
                        text={`**Important**: Make sure the correct provider is chosen in the dropdown below in your props.state.`}
                      />
                    </div>
                  </HelpModal>
                </div>
              </Show>
            </>
          }
          buttonClass="break-all"
          buttonLabel={label()}
          options={services()}
          onSelect={(ev) => changeProvider(ev.value)}
          openSub={props.openSub}
          closeSub={emitter.on}
          preoptions={
            <div class="flex justify-end">
              <Button size="sm" onClick={newProvider}>
                <PlusIcon size={16} />
                New
              </Button>
            </div>
          }
          footer={
            <>
              <Button schema="secondary" onClick={emitter.emit.close}>
                Cancel
              </Button>
            </>
          }
          selected={
            props.state.providerId === '' && props.state.service === 'agnaistic'
              ? 'agnaistic'
              : props.state.providerId
          }
        >
          <Show when={props.page === 'mode'}>
            <Show when={props.state.providerId === '' && props.state.service !== 'agnaistic'}>
              <Button size="sm" onClick={editLegacy}>
                <WifiPen size={16} />
                Edit
              </Button>
            </Show>

            <Show when={showEdit()}>
              <Button size="sm" onClick={editProvider}>
                <WifiPen size={16} />
                Edit
              </Button>
            </Show>

            <Button size="sm" onClick={newProvider}>
              <PlusIcon size={16} />
              New
            </Button>
          </Show>
        </CustomSelect>
      </div>
      <ManageProvider
        user={state.user}
        show={open()}
        close={(reason, provider) => {
          setOpen(false)
          emitter.emit.close()
          if (provider) {
            changeProvider(provider._id)
          }
        }}
        provider={editing()}
      />
      <EditConnectionDetails
        state={props.state}
        setters={props.setters}
        page={props.page}
        sub={undefined}
        show={openLegacy()}
        close={() => setOpenLegacy(false)}
      />
    </>
  )
}

const EditConnectionDetails: Field<{ show: boolean; close: () => void }> = (props) => {
  const useableServices = useUsableServices()
  const services = createMemo(() => {
    const list = useableServices().map((adp) => ({ value: adp, label: ADAPTER_LABELS[adp] }))
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
    props.setters.setState({ thirdPartyUrl: url(), thirdPartyKey: key() })
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
          onChange={(ev) => props.setters.setState('service', ev.value as any)}
        />

        <Select
          fieldName="thirdPartyFormat"
          label="Third-Party Format"
          helperText="Controls how requests are sent"
          items={thirdPartyFormats()}
          value={props.state.thirdPartyFormat}
          hide={props.state.service !== 'kobold'}
          onChange={(ev) =>
            props.setters.setState('thirdPartyFormat', ev.value as ThirdPartyFormat)
          }
        />

        <ThirdPartyUrl
          state={props.state}
          setters={props.setters}
          page={props.page}
          sub={props.sub}
        />
        <ThirdPartyKey
          state={props.state}
          setters={props.setters}
          page={props.page}
          sub={props.sub}
        />
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
        props.setters.hides.thirdPartyUrl ||
        props.state.thirdPartyFormat === 'featherless' ||
        props.state.thirdPartyFormat === 'mistral' ||
        props.state.thirdPartyFormat === 'gemini' ||
        props.state.thirdPartyFormat === 'arli'
      }
      onChange={(ev) => props.setters.setState('thirdPartyUrl', ev.currentTarget.value)}
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
        onChange={(ev) => props.setters.setState('thirdPartyKey', ev.currentTarget.value)}
      />
    </>
  )
}

const Markdown: Component<{ text: string }> = (props) => (
  <div class="rendered-markdown" innerHTML={markdown.makeHtml(props.text)}></div>
)
