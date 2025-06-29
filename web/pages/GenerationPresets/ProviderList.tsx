import { Component, createEffect, createSignal, For, on } from 'solid-js'
import { userStore } from '/web/store'
import { Provider } from '/common/types/presets'
import { getProviderConnection } from '/common/providers'
import Button from '/web/shared/Button'
import { Plus } from 'lucide-solid'
import { ManageProvider } from '../Settings/Provider/Manage'

export const ProviderList: Component = () => {
  const state = userStore((s) => ({ user: s.user }))

  const [show, setShow] = createSignal(false)
  const [curr, setCurr] = createSignal<Provider>()

  createEffect(
    on(
      () => state.user?.providers,
      () => {
        const providers = state.user?.providers
        const current = curr()
        if (!providers || !current?._id) return

        const next = providers.find((p) => p._id === current._id)
        setCurr(next)
      }
    )
  )

  return (
    <>
      <div class="flex flex-col gap-2">
        <div class="flex w-full justify-end">
          <Button
            schema="primary"
            onClick={() => {
              setCurr()
              setShow(true)
            }}
          >
            <Plus /> New
          </Button>
        </div>

        <div class="flex w-full flex-col gap-2">
          <For each={state.user?.providers}>
            {(prov) => (
              <Row
                item={prov}
                onClick={() => {
                  setCurr(prov)
                  setShow(true)
                }}
              />
            )}
          </For>
        </div>
      </div>

      <ManageProvider
        show={show()}
        close={() => setShow(false)}
        user={state.user}
        provider={curr()}
      />
    </>
  )
}

const Row: Component<{ item: Provider; onClick: () => void }> = (props) => {
  const conn = getProviderConnection(props.item)
  return (
    <div
      class="bg-800 hover:bg-600 flex w-full cursor-pointer flex-col items-start justify-center rounded-xl py-1 pl-2 sm:pl-4"
      onClick={props.onClick}
    >
      <div class="">{props.item.name || conn.detail.name}</div>
      <div class="text-500 text-xs">{conn.label}</div>
    </div>
  )
}
