import { RefreshCw, Save, X } from 'lucide-solid'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getAssetUrl, getStrictForm, setComponentPageTitle } from '../../shared/util'
import { adminStore } from '../../store'

const UsersPage: Component = () => {
  setComponentPageTitle('Users')
  const [pw, setPw] = createSignal('')
  const state = adminStore()
  const [info, setInfo] = createSignal<{ name: string; id: string }>()

  const loadInfo = (id: string, name: string) => {
    setInfo({ id, name })
    adminStore.getInfo(id)
  }

  createEffect(() => {
    adminStore.getUsers()
  })

  return (
    <div>
      <PageHeader title="User Management" />

      <div class="flex flex-col gap-2 pb-4">
        <div class="flex justify-end">
          <RefreshCw size={16} class="icon-button" onClick={adminStore.getUsers} />
        </div>
        <For each={state.users}>
          {(user) => (
            <div class="flex h-12 flex-row items-center gap-2 rounded-xl bg-[var(--bg-800)]">
              <div class="w-4/12 px-4 text-xs">{user._id}</div>
              <div class="w-2/12 px-4">{user.username}</div>
              <div class="flex w-6/12 justify-end gap-2 pr-2">
                <Button size="sm" onClick={() => setPw(user.username)}>
                  Set Password
                </Button>
                <Button size="sm" onClick={() => loadInfo(user._id, user.username)}>
                  Info
                </Button>
              </div>
            </div>
          )}
        </For>
        <PasswordModal show={!!pw()} username={pw()} close={() => setPw('')} />
        <InfoModel
          show={!!info()}
          close={() => setInfo()}
          userId={info()?.id!}
          name={info()?.name!}
        />
      </div>
    </div>
  )
}

export default UsersPage

const InfoModel: Component<{ show: boolean; close: () => void; userId: string; name: string }> = (
  props
) => {
  const state = adminStore()

  return (
    <Modal
      show={props.show}
      close={props.close}
      title={`${props.name}: ${state.info?.handle || '...'}`}
      footer={<Button onClick={props.close}>Close</Button>}
    >
      <div class="flex flex-col gap-4">
        <TextInput fieldName="id" label="User ID" value={state.info?.userId} disabled />
        <TextInput fieldName="handle" label="Handle" value={state.info?.handle} disabled />
        <TextInput fieldName="chats" label="Chats" value={state.info?.chats} disabled />
        <TextInput
          fieldName="characters"
          label="Characters"
          value={state.info?.characters}
          disabled
        />
        <Show when={state.info?.avatar}>
          <div class="flex w-full justify-center">
            <img src={getAssetUrl(state.info?.avatar!)} height="128px" />
          </div>
        </Show>
      </div>
    </Modal>
  )
}

const PasswordModal: Component<{ username: string; show: boolean; close: () => void }> = (
  props
) => {
  let ref: any
  const save = () => {
    const body = getStrictForm(ref, { newPassword: 'string' })
    adminStore.setPassword(props.username, body.newPassword, props.close)
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title="Change Password"
      footer={
        <>
          {' '}
          <Button schema="secondary" onClick={props.close}>
            <X /> Cancel
          </Button>
          <Button onClick={save}>
            <Save /> Update
          </Button>
        </>
      }
    >
      <div>
        Update password for: <b>{props.username}</b>
      </div>
      <div>
        <form ref={ref}>
          <TextInput type="password" fieldName="newPassword" required />
        </form>
      </div>
    </Modal>
  )
}
