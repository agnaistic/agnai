import { AlertTriangle, Save, VenetianMask, X } from 'lucide-solid'
import {
  Component,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from 'solid-js'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import { adminStore, settingStore, toastStore, userStore } from '../../store'
import { TitleCard } from '/web/shared/Card'
import { rootModalStore } from '/web/store/root-modal'
import { useNavigate } from '@solidjs/router'
import { isLoggedIn } from '/web/store/api'
import { SubscriptionPage } from './SubscriptionPage'
import { useTabs } from '/web/shared/Tabs'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

export const ProfileModal: Component = () => {
  const [t] = useTransContext()

  const state = userStore()
  const config = userStore((s) => ({ tiers: s.tiers.filter((t) => t.enabled) }))
  const tabs = useTabs(['Profile', 'Subscription'], 0)

  const [footer, setFooter] = createSignal<any>()

  onMount(() => {
    userStore.getTiers()
  })

  const displayTabs = createMemo(() => {
    if (!config.tiers.length || !isLoggedIn()) return false
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
      ariaLabel={t('your_profile')}
      ariaDescription={t('update_your_profile_information')}
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
  const [t] = useTransContext()

  setComponentPageTitle(t('my_profile'))
  const nav = useNavigate()
  const state = userStore()
  const admin = adminStore()
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
    <Button onClick={submit} ariaLabel="Update profile">
      <Save aria-hidden="true" />
      <span aria-hidden="true">{t('update_profile')}</span>
    </Button>
  )

  return (
    <>
      <PageHeader title={t('your_profile')} subPage />
      <form ref={formRef!} onSubmit={submit} aria-label={t('edit_profile')}>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row gap-2">
              <AvatarIcon avatarUrl={state.profile?.avatar} />
              <div class="flex items-center">{state.profile?.handle}</div>
            </div>
          </div>

          <TitleCard type="orange" ariaRole="note" ariaLabel={t('impersonate')}>
            <div class="flex flex-wrap items-center">
              <Trans key="you_can_impersonate_characters_message_1">
                You can
                <Button class="mx-1" size="sm" onClick={() => settingStore.toggleImpersonate(true)}>
                  Impersonate
                </Button>
                characters by clicking the
              </Trans>
              <VenetianMask size={16} class="mx-1" aria-hidden="true" />
              {t('you_can_impersonate_characters_message_2')}
            </div>
          </TitleCard>

          <TextInput
            label={t('id')}
            helperText={t('your_user_id_message')}
            fieldName="userid"
            value={state.user?._id}
            disabled
          />

          <TextInput
            label={t('username')}
            helperText={t('your_user_name_message')}
            fieldName="username"
            value={state.user?.username}
            disabled
          />

          <TextInput
            label={t('display_name')}
            helperText={t('display_name_message')}
            fieldName="handle"
            value={state.profile?.handle}
          />

          <FileInput
            label={t('profile_image')}
            fieldName="avatar"
            accept="image/jpeg,image/png"
            helperText={t('profile_image_message')}
            onUpdate={onAvatar}
          />

          <div>
            <Button onClick={() => setPass(true)}>{t('change_password')}</Button>
          </div>

          <Show when={state.user?._id !== 'anon'}>
            <div class="flex justify-center gap-4">
              <Show when={admin.impersonating}>
                <Button schema="warning" onClick={() => adminStore.unimpersonate()}>
                  {t('un_impersonate')}
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
                  {t('logout')}
                </Button>
              </Show>

              <Button schema="red" onClick={() => setDel(true)}>
                <AlertTriangle /> {t('delete_account')} <AlertTriangle />
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
