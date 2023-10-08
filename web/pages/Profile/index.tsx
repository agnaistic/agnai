import { AlertTriangle, Save, VenetianMask, X } from 'lucide-solid'
import { Component, Show, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import { settingStore, toastStore, userStore } from '../../store'
import { TitleCard } from '/web/shared/Card'
import { rootModalStore } from '/web/store/root-modal'
import { useNavigate } from '@solidjs/router'
import { isLoggedIn } from '/web/store/api'
import { SubscriptionPage } from './SubscriptionPage'

export const ProfileModal: Component = () => {
  const state = userStore()
  const config = userStore((s) => ({ tiers: s.tiers.filter((t) => t.enabled) }))

  const [footer, setFooter] = createSignal<any>()

  onMount(() => {
    userStore.getTiers()
  })

  const profile = {
    name: 'Profile',
    content: <ProfilePage footer={setFooter} />,
  }

  const subscription = {
    name: 'Subscription',
    content: <SubscriptionPage />,
  }

  const tabs = createMemo(() => {
    if (!config.tiers.length || !isLoggedIn()) return

    return [profile, subscription]
  })

  return (
    <Modal
      show={state.showProfile}
      close={() => userStore.modal(false)}
      footer={
        <>
          <Button schema="secondary" onClick={() => userStore.modal(false)}>
            Close
          </Button>
          {footer()}
        </>
      }
      fixedHeight
      maxWidth="half"
      tabs={tabs()}
    >
      <Show when={!tabs()}>
        <ProfilePage footer={setFooter} />
      </Show>
    </Modal>
  )
}

const ProfilePage: Component<{ footer?: (children: any) => void }> = (props) => {
  let formRef: HTMLFormElement

  setComponentPageTitle('My profile')
  const nav = useNavigate()
  const state = userStore()
  const [pass, setPass] = createSignal(false)
  const [del, setDel] = createSignal(false)
  const [avatar, setAvatar] = createSignal<File | undefined>()

  const onAvatar = (files: FileInputResult[]) => {
    const [file] = files
    if (!file) return setAvatar()
    setAvatar(() => file.file)
  }

  const submit = () => {
    const body = getStrictForm(formRef, { handle: 'string' })
    const payload = { handle: body.handle, avatar: avatar() }
    userStore.updateProfile(payload)
  }

  createEffect(() => {
    userStore.getProfile()
    userStore.getConfig()
  })

  onMount(() => {
    props.footer?.(footer)
  })

  const footer = (
    <Button onClick={submit}>
      <Save />
      Update Profile
    </Button>
  )

  return (
    <>
      <PageHeader title="Your Profile" />
      <form ref={formRef!} onSubmit={submit}>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row gap-2">
              <AvatarIcon avatarUrl={state.profile?.avatar} />
              <div class="flex items-center">{state.profile?.handle}</div>
            </div>
          </div>

          <TitleCard type="orange">
            <div class="flex flex-wrap items-center">
              You can{' '}
              <div class="inline">
                <Button class="mx-1" size="sm" onClick={() => settingStore.toggleImpersonate(true)}>
                  Impersonate
                </Button>{' '}
              </div>
              characters by clicking the <VenetianMask size={16} class="mx-1" /> icon at the top of
              the main menu.
            </div>
          </TitleCard>

          <TextInput
            label="ID"
            helperText="Your user ID. This is used by others to send you chat invitations."
            fieldName="userid"
            value={state.user?._id}
            disabled
          />

          <TextInput
            label="Username"
            helperText="Your username. This cannot be changed. You never need to share your username."
            fieldName="username"
            value={state.user?.username}
            disabled
          />

          <TextInput
            label="Display Name"
            helperText="This is your publicly visible name."
            fieldName="handle"
            value={state.profile?.handle}
          />

          <FileInput
            label="Profile Image"
            fieldName="avatar"
            accept="image/jpeg,image/png"
            helperText={'File size limit of 2MB'}
            onUpdate={onAvatar}
          />

          <div>
            <Button onClick={() => setPass(true)}>Change Password</Button>
          </div>

          <Show when={state.user?._id !== 'anon'}>
            <div class="flex justify-center gap-4">
              <Button
                schema="warning"
                onClick={() => {
                  userStore.logout()
                  nav('/')
                }}
              >
                Logout
              </Button>

              <Button schema="red" onClick={() => setDel(true)}>
                <AlertTriangle /> Delete Account <AlertTriangle />
              </Button>
            </div>
          </Show>

          <Show when={!props.footer}>
            <div class="mt-4 flex w-full justify-end">{footer}</div>
          </Show>
        </div>
      </form>
      <PasswordModal show={pass()} close={() => setPass(false)} />
      <DeleteAccountModal show={del()} close={() => setDel(false)} />
    </>
  )
}

export default ProfilePage

const PasswordModal: Component<{ show: boolean; close: () => void }> = (props) => {
  let ref: any
  const save = () => {
    const body = getStrictForm(ref, { newPassword: 'string', confirmPassword: 'string' })
    if (body.newPassword !== body.confirmPassword) {
      toastStore.warn(`Your passwords do not match`)
      return
    }

    userStore.changePassword(body.newPassword, props.close)
  }

  rootModalStore.addModal({
    id: 'user-password-change',
    element: (
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
          <form ref={ref} class="flex flex-col gap-2">
            <div class="w-full justify-center">Update your password</div>
            <TextInput
              type="password"
              fieldName="newPassword"
              required
              placeholder="New Password"
            />
            <TextInput
              type="password"
              fieldName="confirmPassword"
              required
              placeholder="Repeat Password"
            />
          </form>
        </div>
      </Modal>
    ),
  })

  return null
}

const DeleteAccountModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const state = userStore()
  const [username, setUsername] = createSignal('')

  const deleteAccount = () => {
    if (!username()) return
    if (username() !== state.user?.username) return

    props.close()
    userStore.deleteAccount()
  }

  rootModalStore.addModal({
    id: 'delete-account-modal',
    element: (
      <Modal
        title="Delete Account"
        show={props.show}
        close={props.close}
        footer={
          <>
            <Button schema="secondary" onClick={props.close}>
              Cancel
            </Button>
          </>
        }
      >
        <div class="flex flex-col items-center gap-2">
          <TitleCard type="rose" class="font-bold">
            This is irreversible! Your account cannot be recovered if it is deleted.
          </TitleCard>

          <p>Enter your username then click "Confirm" to confirm the deletion of your account</p>

          <TextInput
            fieldName="delete-username"
            onInput={(ev) => setUsername(ev.currentTarget.value)}
            placeholder="Username"
          />
          <Button
            disabled={username() !== state.user?.username}
            schema="red"
            onClick={deleteAccount}
          >
            Confirm Deletion
          </Button>
        </div>
      </Modal>
    ),
  })

  return null
}
