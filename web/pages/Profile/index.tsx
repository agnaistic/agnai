import { AlertTriangle, Save, X } from 'lucide-solid'
import {
  Component,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onMount,
} from 'solid-js'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import Modal, { RootModal } from '../../shared/Modal'
import TextInput from '../../shared/TextInput'
import { setComponentPageTitle } from '../../shared/util'
import { adminStore, settingStore, toastStore, userStore } from '../../store'
import { Pill, TitleCard } from '/web/shared/Card'
import { rootModalStore } from '/web/store/root-modal'
import { useNavigate, useSearchParams } from '@solidjs/router'
import { SubscriptionPage } from './SubscriptionPage'
import { useTabs } from '/web/shared/Tabs'
import { Page } from '/web/Layout'
import { useGoogleReady } from '/web/shared/hooks'
import { startTour } from '/web/tours'
import { createStore } from 'solid-js/store'

export const ProfileModal: Component = () => {
  const state = userStore()
  const config = userStore((s) => ({ tiers: s.tiers.filter((t) => t.enabled) }))
  const tabs = useTabs(['Profile', 'Subscription'], 0)
  const [search, setSearch] = useSearchParams()

  createEffect(() => {
    const name = search.profile_tab || ''
    if (!name) return

    const index = tabs.tabs.findIndex((t) => t.toLowerCase() === name.toLowerCase())
    if (index > -1) {
      tabs.select(index)
    }

    setSearch({ profile_tab: undefined })
  })

  const [footer, setFooter] = createSignal<any>()

  onMount(() => {
    userStore.getTiers()
  })

  const displayTabs = createMemo(() => {
    if (!config.tiers.length) return false
    return true
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
      tabs={displayTabs() ? tabs : undefined}
      ariaLabel="Your profile"
      ariaDescription="Update your profile information."
    >
      <Switch>
        <Match when={!displayTabs()}>
          <ProfilePage footer={setFooter} />
        </Match>
        <Match when={tabs.current() === 'Profile'}>
          <ProfilePage footer={setFooter} />
        </Match>
        <Match when={tabs.current() === 'Subscription'}>
          <SubscriptionPage />
        </Match>
      </Switch>
    </Modal>
  )
}

const ProfilePage: Component<{ footer?: (children: any) => void }> = (props) => {
  let formRef: HTMLFormElement
  let googleRef: any

  setComponentPageTitle('My profile')
  const nav = useNavigate()
  const state = userStore()
  const admin = adminStore()
  const settings = settingStore()

  const [handle, setHandle] = createSignal(state.profile?.handle || '')
  const [pass, setPass] = createSignal(false)
  const [del, setDel] = createSignal(false)
  const [avatar, setAvatar] = createSignal<File | undefined>()
  const google = useGoogleReady()

  const canuseGoogle = createMemo(
    () =>
      !!settings.config.serverConfig?.googleClientId &&
      (settings.config.serverConfig?.googleEnabled || settings.flags.google)
  )

  const onAvatar = (files: FileInputResult[]) => {
    const [file] = files
    if (!file) return setAvatar()
    setAvatar(() => file.file)
  }

  const submit = () => {
    const payload = { handle: handle(), avatar: avatar() }
    userStore.updateProfile(payload)
    userStore.modal(false)
  }

  onMount(() => {
    userStore.getProfile()
    userStore.getConfig()
  })

  createEffect(
    on(
      () => state.profile?.handle,
      (name) => {
        if (name === undefined) return
        setHandle(name)
      }
    )
  )

  const initGoogle = () => {
    const win: any = window
    const api = win.google?.accounts?.id

    if (!api) return

    const enabled = settings.config.serverConfig?.googleEnabled || settings.flags.google

    if (settings.config.serverConfig?.googleClientId && enabled) {
      api.initialize({
        client_id: settings.config.serverConfig?.googleClientId,
        callback: (result: any) => {
          userStore.handleGoogleCallback('link', result)
        },
      })

      api.renderButton(googleRef, {
        theme: 'filled_black',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
      })
    }
  }

  createEffect(
    on(
      () => google(),
      () => {
        initGoogle()
      }
    )
  )

  onMount(() => {
    props.footer?.(footer)

    if (state.profile?.handle === 'You') {
      startTour('profile', true)
    }
  })

  const footer = (
    <Button onClick={submit} ariaLabel="Update profile">
      <Save aria-hidden="true" />
      <span aria-hidden="true">Update Profile</span>
    </Button>
  )

  return (
    <Page>
      <form ref={formRef!} onSubmit={submit} aria-label="Edit profile">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row gap-2">
              <AvatarIcon
                avatarUrl={state.profile?.avatar}
                format={{ size: 'md', corners: 'circle' }}
              />
              <div class="flex items-center">{state.profile?.handle}</div>
            </div>
          </div>

          <TitleCard type="bg" ariaRole="note" ariaLabel="Impersonate">
            <div class="flex flex-wrap items-center justify-center">
              You can{' '}
              <div class="inline">
                <Button class="mx-1" size="sm" onClick={() => settingStore.toggleImpersonate(true)}>
                  Impersonate
                </Button>{' '}
              </div>
              characters by clicking the{' '}
              <Pill small class="mx-0.5 px-0.5">
                Persona
              </Pill>{' '}
              button at the top of the main menu.
            </div>
          </TitleCard>

          <Show when={state.user?._id !== 'anon' && canuseGoogle() && !admin.impersonating}>
            <div class="flex justify-center">
              <TitleCard class="flex w-fit flex-col items-center justify-center gap-1" type="hl">
                <Show when={!state.user?.google?.sub}>
                  <div class="flex justify-center text-sm font-bold">
                    Link with Google to enable Sign-in with Google
                  </div>
                  <div
                    class="flex justify-center"
                    ref={(ref) => {
                      googleRef = ref
                    }}
                    id="g_id_onload"
                    data-context="signin"
                    data-ux_mode="popup"
                    data-login_uri={`${location.origin}/oauth/google`}
                    data-itp_support="true"
                  ></div>
                </Show>

                <Show when={!!state.user?.google?.sub}>
                  <div class="flex justify-center text-sm font-bold">
                    Your account is Linked to Google
                  </div>
                  <Show when={state.user?.username !== `google_${state.user?.google?.sub}`}>
                    <div class="flex justify-center">
                      <Button
                        class="justify-center"
                        size="sm"
                        schema="warning"
                        onClick={() => userStore.unlinkGoogleAccount(() => initGoogle())}
                      >
                        Unlink Google Account
                      </Button>
                    </div>
                  </Show>
                </Show>
              </TitleCard>
            </div>
          </Show>

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
            parentClass="tour-displayname"
            helperText="Your name in chats and to others (when not impersonating)"
            fieldName="handle"
            value={handle()}
            onChange={(ev) => setHandle(ev.currentTarget.value)}
          />

          <FileInput
            label={
              <div class="flex items-center gap-2">
                <div>Profile Image</div>
                <Show when={!!state.profile?.avatar}>
                  <div class="link text-sm" onClick={userStore.removeProfileAvatar}>
                    Remove Avatar
                  </div>
                </Show>
              </div>
            }
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
              <Show when={admin.impersonating}>
                <Button schema="warning" onClick={() => adminStore.unimpersonate()}>
                  Unimpersonate
                </Button>
              </Show>
              <Show when={!admin.impersonating}>
                <Button
                  schema="warning"
                  onClick={() => {
                    userStore.logout()
                    nav('/')
                  }}
                >
                  Logout
                </Button>
              </Show>

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
    </Page>
  )
}

export default ProfilePage

const PasswordModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const [store, setStore] = createStore({ newPassword: '', confirmPassword: '' })

  const save = () => {
    if (store.newPassword !== store.confirmPassword) {
      toastStore.warn(`Your passwords do not match`)
      return
    }

    if (!store.newPassword) {
      toastStore.warn('You must provide a password')
      return
    }

    userStore.changePassword(store.newPassword, props.close)
  }

  return (
    <RootModal
      show={props.show}
      close={props.close}
      title="Change Password"
      ariaLabel="Change Password"
      ariaDescription="This window lets you change your account password"
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
        <form class="flex flex-col gap-2">
          <div class="w-full justify-center">Update your password</div>
          <TextInput
            type="password"
            required
            placeholder="New Password"
            value={store.newPassword}
            onChange={(ev) => setStore('newPassword', ev.currentTarget.value)}
          />
          <TextInput
            type="password"
            required
            placeholder="Confirm Password"
            value={store.confirmPassword}
            onChange={(ev) => setStore('confirmPassword', ev.currentTarget.value)}
          />
        </form>
      </div>
    </RootModal>
  )
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
        ariaLabel="Delete account"
        ariaDescription="Warning: This window deletes your current account"
      >
        <div class="flex flex-col items-center gap-2">
          <TitleCard type="rose" class="font-bold">
            This is irreversible! Your account cannot be recovered if it is deleted.
          </TitleCard>

          <p>Enter your username then click "Confirm" to confirm the deletion of your account</p>

          <TextInput
            fieldName="delete-username"
            onChange={(ev) => setUsername(ev.currentTarget.value)}
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
