import { Save, X } from 'lucide-solid'
import { Component, createEffect, createSignal, For } from 'solid-js'
import Button from '../../shared/Button'
import Modal, { ModalFooter } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm } from '../../shared/util'
import { adminStore } from '../../store/admin'

const UsersPage: Component = () => {
  const [pw, setPw] = createSignal('')
  const state = adminStore()

  createEffect(() => {
    adminStore.getUsers()
  })

  return (
    <div>
      <PageHeader title="User Management" />

      <div class="flex flex-col gap-2">
        <For each={state.users}>
          {(user) => (
            <div class="flex h-12 flex-row items-center gap-2 rounded-xl bg-slate-900">
              <div class="w-2/12 px-4">{user._id.slice(0, 8)}</div>
              <div class="w-2/12 px-4">{user.username}</div>
              <div class="flex w-8/12 justify-end pr-2">
                <Button size="sm" onClick={() => setPw(user.username)}>
                  Set Password
                </Button>
              </div>
            </div>
          )}
        </For>
        <PasswordModal show={!!pw()} username={pw()} close={() => setPw('')} />
      </div>
    </div>
  )
}

export default UsersPage

const PasswordModal: Component<{ username: string; show: boolean; close: () => void }> = (
  props
) => {
  let ref: any
  const save = () => {
    const body = getStrictForm(ref, { newPassword: 'string' })
    adminStore.setPassword(props.username, body.newPassword, props.close)
  }

  return (
    <Modal show={props.show} close={props.close} title="Change Password">
      <div>
        Update password for: <b>{props.username}</b>
      </div>
      <div>
        <form ref={ref}>
          <TextInput type="password" fieldName="newPassword" required />
          <ModalFooter>
            <Button schema="secondary" onClick={props.close}>
              <X /> Cancel
            </Button>
            <Button onClick={save}>
              <Save /> Update
            </Button>
          </ModalFooter>
        </form>
      </div>
    </Modal>
  )
}
