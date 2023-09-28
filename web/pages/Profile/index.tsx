import { AlertTriangle, Save, VenetianMask, X } from 'lucide-solid'
import {
  Component,
  For,
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
import Modal, { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import { settingStore, toastStore, userStore } from '../../store'
import { SolidCard, TitleCard } from '/web/shared/Card'
import { rootModalStore } from '/web/store/root-modal'
import { useNavigate } from '@solidjs/router'
import { TierCard } from './TierCard'
import { isLoggedIn } from '/web/store/api'
import { AppSchema } from '/common/types'

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
    name: 'Account',
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

const SubscriptionPage: Component = (props) => {
  const user = userStore()
  const cfg = userStore((s) => ({
    tiers: s.tiers.sort((l, r) => r.level - l.level),
    level: s.user?.sub?.level ?? -1,
    tier: s.tiers.find((t) => t._id === s.user?.sub?.tierId),
    downgrade: s.subStatus?.downgrading?.tierId,
  }))

  const [showUnsub, setUnsub] = createSignal(false)
  const [showUpgrade, setUpgrade] = createSignal<AppSchema.SubscriptionTier>()
  const [showDowngrade, setDowngrade] = createSignal<AppSchema.SubscriptionTier>()

  const candidates = createMemo(() => {
    return cfg.tiers
      .filter((t) => t.level !== cfg.level && t.enabled && !t.deletedAt && !!t.productId)
      .sort((l, r) => l.level - r.level)
  })

  const renews = createMemo(() => {
    if (!user.user?.billing) return ''
    const last = new Date(user.user.billing.validUntil)
    return last.toLocaleDateString()
  })

  const onSubscribe = (tierId: string) => {
    userStore.startCheckout(tierId)
  }

  const currentText = createMemo(() => {
    if (user.user?.billing?.status === 'active') {
      if (user.user?.billing?.cancelling) return 'Cancels at'
      return `Renews at`
    }
    return 'Valid until'
  })

  const canResume = createMemo(() => {
    if (!user.user?.billing?.cancelling) return false
    const threshold = new Date(user.user.billing.validUntil)
    return threshold.valueOf() > Date.now()
  })

  onMount(() => {
    userStore.subscriptionStatus()
  })

  return (
    <>
      <div class="flex flex-col gap-2">
        <div class="flex w-full flex-col items-center gap-4">
          <SolidCard class="flex flex-col gap-2" border>
            <p class="flex justify-center text-[var(--hl-500)]">
              <strong>Why subscribe?</strong>
            </p>
            <p>Subscribing to Agnaistic grants you access to higher quality models.</p>
            <p>
              In the future you'll also have access to additional features! Such as: Image
              generation, image storage, and with third-party apps like Discord, Slack, and
              WhatsApp, and more!
            </p>
            <p>Subscribing allows me to spend more time developing and enhancing Agnaistic.</p>
          </SolidCard>

          <Show when={cfg.tier}>
            <h3 class="font-bold">Current Subscription</h3>
            <TierCard tier={cfg.tier!}>
              <div class="flex flex-col items-center gap-2">
                <div class="text-700 text-sm italic">
                  {currentText()} {renews()}
                </div>
                <Switch>
                  <Match when={cfg.downgrade && cfg.tier!._id !== cfg.downgrade}>
                    Your subscription is set to downgrade
                    <Button
                      schema="green"
                      onClick={() => userStore.modifySubscription(cfg.tier?._id!)}
                      disabled={user.billingLoading}
                    >
                      Cancel Downgrade
                    </Button>
                  </Match>
                  <Match when={canResume()}>
                    Your subscription is currently scheduled to cancel
                    <Button
                      schema="green"
                      onClick={userStore.resumeSubscription}
                      disabled={user.billingLoading}
                    >
                      Resume Subscription
                    </Button>
                  </Match>
                  <Match when>
                    <SolidCard
                      bg="bg-700"
                      class="flex w-1/2 justify-center text-lg font-bold text-[var(--green-600)]"
                    >
                      Subscribed!
                    </SolidCard>
                  </Match>
                </Switch>
              </div>
            </TierCard>
          </Show>

          <Show when={candidates().length > 0}>
            <div>Subscription Alternatives</div>
          </Show>
          <div class="flex w-full flex-wrap justify-center gap-4">
            <For each={candidates()}>
              {(each) => (
                <>
                  <TierCard tier={each} class="w-1/3">
                    <div class="mt-4 flex justify-center">
                      <Switch>
                        <Match when={cfg.tier && cfg.level < each.level}>
                          <Button
                            schema="success"
                            disabled={canResume() || user.billingLoading}
                            onClick={() => setUpgrade(each)}
                          >
                            Upgrade
                          </Button>
                        </Match>

                        <Match
                          when={cfg.tier && cfg.level > each.level && each._id === cfg.downgrade}
                        >
                          <Button
                            schema="gray"
                            disabled
                            onClick={() => userStore.modifySubscription(each._id)}
                          >
                            Downgrading...
                          </Button>
                        </Match>

                        <Match when={cfg.tier && cfg.level > each.level}>
                          <Button
                            schema="gray"
                            disabled={canResume() || user.billingLoading}
                            onClick={() => setDowngrade(each)}
                          >
                            Downgrade
                          </Button>
                        </Match>

                        <Match when>
                          <Button
                            schema="success"
                            disabled={
                              each._id === cfg.tier?._id || canResume() || user.billingLoading
                            }
                            onClick={() => onSubscribe(each._id)}
                          >
                            Subscribe
                          </Button>
                        </Match>
                      </Switch>
                    </div>
                  </TierCard>
                </>
              )}
            </For>
          </div>

          <div class="mt-4 flex gap-4">
            {/* <Button onClick={userStore.validateSubscription} disabled={user.billingLoading}>
              Validate
            </Button> */}
            <Show when={cfg.tier}>
              <Button schema="red" onClick={() => setUnsub(true)} disabled={user.billingLoading}>
                Unsubscribe
              </Button>
            </Show>
          </div>
        </div>
      </div>
      <ConfirmModal
        show={showUnsub()}
        close={() => setUnsub(false)}
        message="Are you sure you wish to unsubscribe?"
        confirm={userStore.stopSubscription}
      />

      <ConfirmModal
        show={!!showUpgrade()}
        close={() => setUpgrade()}
        message={
          <div class="flex flex-col items-center justify-center gap-2">
            <p>You will be immediately charged upon confirm.</p>
            <p>Are you sure you wish to upgrade now?</p>
          </div>
        }
        confirm={() => userStore.modifySubscription(showUpgrade()!._id)}
      />

      <ConfirmModal
        show={!!showDowngrade()}
        close={() => setDowngrade()}
        message={
          <div class="flex flex-col items-center justify-center gap-2">
            <p>
              Your downgrade will take affect at the beginning of your next billing period. You will
              retain access to your current subscription tier until your downgrade takes affect.
            </p>
            <p>Are you sure you wish to downgrade?</p>
          </div>
        }
        confirm={() => userStore.modifySubscription(showDowngrade()!._id)}
      />
    </>
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
