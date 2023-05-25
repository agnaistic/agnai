import { Component, For, createMemo, createSignal, onMount } from 'solid-js'
import { apiKeyStore, toastStore } from '/web/store'
import { Copy, Key, Plus, Trash, X } from 'lucide-solid'
import PageHeader from '/web/shared/PageHeader'
import Button from '/web/shared/Button'
import { getFormEntries, getStrictForm, toDuration } from '/web/shared/util'
import Modal from '/web/shared/Modal'
import { AppSchema } from '/srv/db/schema'
import { Toggle } from '/web/shared/Toggle'
import TextInput from '/web/shared/TextInput'
import { FormLabel } from '/web/shared/FormLabel'

type KeyInfo = Omit<AppSchema.ApiKey, '_id' | 'kind' | 'createdAt' | 'updatedAt' | 'userId' | 'key'>

const newKey: KeyInfo = {
  name: '',
  scopes: ['read:profile', 'read:chars', 'read:chats', 'write:chats'],
}

export const keyValidator = {
  name: 'string',
} as const

const APIKeysPage = () => {
  let ref: any
  const state = apiKeyStore()

  const [showDelete, setShowDelete] = createSignal<AppSchema.ApiKey>()
  const [showCreate, setShowCreate] = createSignal(false)
  const [showView, setShowView] = createSignal<AppSchema.ApiKey>()
  const [created, setCreated] = createSignal<AppSchema.ApiKey>()

  const sortedKeys = createMemo(() =>
    [...state.keys].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )

  onMount(() => {
    apiKeyStore.getApiKeys()
  })

  const onCreateApiKeySubmit = async (ev: Event) => {
    ev.preventDefault()
    const body = getStrictForm(ref, keyValidator)

    const inputs = getFormEntries(ref)
    const scopes = []
    for (const [key, value] of inputs) {
      const [name, scope] = key.split('|')
      if (name === 'scopes' && value) scopes.push(scope)
    }

    if (!scopes.length) {
      toastStore.error('You must select at least one scope')
      return
    }

    apiKeyStore.createApiKey(body.name, scopes, (key) => {
      setShowCreate(false)
      setCreated(key)
    })
  }

  const deleteKey = async (id: string) => {
    apiKeyStore.deleteApiKey(id)
    setShowDelete(undefined)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(created()!.key)
      setCreated(undefined)
    } catch (e: any) {
      toastStore.error(`Failed to copy to clipboard: ${e.message}`)
    }
  }

  return (
    <>
      <PageHeader
        title={
          <div class="flex w-full justify-between">
            <div>API Keys</div>
            <div class="flex text-base">
              <div class="px-1">
                <Button onClick={() => setShowCreate(true)}>
                  <Plus /> <span class="hidden sm:inline">New</span>
                </Button>
              </div>
            </div>
          </div>
        }
      />

      <div class="flex flex-col gap-2">
        <div class="flex flex-col gap-2">
          <For each={sortedKeys()}>
            {(key) => (
              <div class="flex w-full justify-between gap-2 rounded-lg bg-[var(--bg-800)] p-1 hover:bg-[var(--bg-700)]">
                <div
                  class="flex w-10/12 cursor-pointer gap-2 sm:w-11/12"
                  onClick={() => setShowView(key)}
                >
                  <div class="flex items-center justify-center">
                    <Key />
                  </div>
                  <div class="flex max-w-[90%] flex-col justify-center gap-0">
                    <div class="items-center overflow-hidden text-ellipsis whitespace-nowrap font-bold leading-5">
                      <b>Key: </b>
                      {key.name || 'Unnamed Key'}
                    </div>
                    <div class="overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-4">
                      <b>Scopes: </b>
                      {key.scopes.join(', ')}
                    </div>
                    <div class="flex text-xs italic text-[var(--text-600)]">
                      Created {toDuration(new Date(key.createdAt))} ago.
                    </div>
                  </div>
                </div>
                <div
                  class="flex cursor-pointer items-center px-2 hover:text-red-500"
                  onClick={() => setShowDelete(key)}
                >
                  <Trash size={16} />
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      <Modal title="Create API Key" show={showCreate()} close={() => setShowCreate(false)}>
        <form class="flex flex-col gap-4" onSubmit={onCreateApiKeySubmit} ref={ref}>
          <ApiKeyForm key={newKey} />

          <div class="flex justify-end gap-2">
            <Button onClick={() => setShowCreate(false)} schema="secondary">
              <X />
              Cancel
            </Button>
            <Button type="submit">
              <Plus />
              Create Key
            </Button>
          </div>
        </form>
      </Modal>

      <Modal title="View API Key" show={!!showView()} close={() => setShowView(undefined)}>
        <form class="flex flex-col gap-4">
          <ApiKeyForm key={showView()!} disabled />

          <div class="flex justify-end gap-2">
            <Button onClick={() => setShowView(undefined)} schema="secondary">
              <X />
              Close
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        title="API Key Created"
        show={!!created()}
        close={() => setCreated(undefined)}
        maxWidth="half"
        footer={
          <>
            <Button schema="primary" onClick={() => copyToClipboard()}>
              <Copy />
              Copy & Close
            </Button>
            <Button schema="primary" onClick={() => setCreated(undefined)}>
              <X />
              Close
            </Button>
          </>
        }
      >
        <div class="flex flex-col justify-center text-center">
          <p>This is your API key.</p>
          <p>Copy this now! You won't be able to access it once this window is closed.</p>
          <code class="m-4 p-2">{created()?.key}</code>
        </div>
      </Modal>

      <Modal
        title="Delete API Key"
        show={!!showDelete()}
        close={() => setShowDelete(undefined)}
        footer={
          <>
            <Button schema="secondary" onClick={() => setShowDelete(undefined)}>
              <X />
              Cancel
            </Button>

            <Button onClick={() => deleteKey(showDelete()!._id)}>
              <Trash /> Delete
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete the key <i>{showDelete()?.name}</i>?
        </p>
      </Modal>
    </>
  )
}

export default APIKeysPage

const ApiKeyForm: Component<{ key: KeyInfo; disabled?: boolean }> = (props) => {
  return (
    <>
      <TextInput
        fieldName="name"
        label="Key Name"
        helperText="A name to help you identify your app key"
        placeholder="My Key"
        value={props.key.name}
        disabled={props.disabled}
      />
      <FormLabel label="Scopes" helperText="The scopes this key will have access to" />
      <div class="flex flex-row gap-2">
        <div class="flex-1">
          <Toggle
            fieldName="scopes|read:profile"
            label="Read User"
            value={props.key.scopes.includes('read:profile')}
            disabled={props.disabled}
          />
        </div>
        <div class="flex-1">
          <Toggle
            fieldName="scopes|read:chars"
            label="Read Chars"
            value={props.key.scopes.includes('read:chars')}
            disabled={props.disabled}
          />
        </div>
        <div class="flex-1">
          <Toggle
            fieldName="scopes|read:chats"
            label="Read Chats"
            value={props.key.scopes.includes('read:chats')}
            disabled={props.disabled}
          />
        </div>
        <div class="flex-1">
          <Toggle
            fieldName="scopes|write:chats"
            label="Write Chats"
            value={props.key.scopes.includes('write:chats')}
            disabled={props.disabled}
          />
        </div>
      </div>
    </>
  )
}
