import { For, onMount } from 'solid-js'
import { apiKeyStore } from '/web/store'
import { Key, Plus, Trash } from 'lucide-solid'
import PageHeader from '/web/shared/PageHeader'
import Button from '/web/shared/Button'
import { toDuration } from '/web/shared/util'
import Modal from '/web/shared/Modal'

const APIKeysPage = () => {
  const state = apiKeyStore()

  onMount(() => {
    apiKeyStore.getApiKeys()
  })

  const createKey = async () => {
    apiKeyStore.createApiKey('New Key', [])
  }

  const deleteKey = async (id: string) => {
    apiKeyStore.deleteApiKey(id)
  }

  return (
    <>
      <PageHeader
        title={
          <div class="flex w-full justify-between">
            <div>API Keys</div>
            <div class="flex text-base">
              <div class="px-1">
                <Button onClick={() => createKey()}>
                  <Plus /> <span class="hidden sm:inline">New</span>
                </Button>
              </div>
            </div>
          </div>
        }
      />

      <div class="flex flex-col gap-2">
        <div class="flex flex-col gap-2">
          <For each={state.keys}>
            {(key) => (
              <div class="flex w-full justify-between gap-2 rounded-lg bg-[var(--bg-800)] p-1">
                <div class="flex w-10/12 gap-2 sm:w-11/12">
                  <div class="flex items-center justify-center">
                    <Key />
                  </div>
                  <div class="flex max-w-[90%] flex-col justify-center gap-0">
                    <div class="items-center overflow-hidden text-ellipsis whitespace-nowrap font-bold leading-5">
                      {key.name}
                    </div>
                    <div class="overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-4">
                      {key.scopes.join(', ')}
                    </div>
                    <div class="flex text-xs italic text-[var(--text-600)]">
                      Created {toDuration(new Date(key.createdAt))} ago.
                    </div>
                  </div>
                </div>
                <div
                  class="flex cursor-pointer items-center px-2 hover:text-red-500"
                  onClick={() => deleteKey(key._id)}
                >
                  <Trash size={16} />
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      <Modal show={!!state.created} close={() => apiKeyStore.createApiKeyComplete()}>
        <p>Keep this preciously, you won't be able to read it once this window is closed</p>
        <code>{state.created?.key}</code>
      </Modal>
    </>
  )
}

export default APIKeysPage
