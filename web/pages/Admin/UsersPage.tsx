import { HatGlasses, X } from 'lucide-solid'
import { Component, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import Button, { ToggleButton } from '../../shared/Button'
import Modal from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getAssetUrl, setComponentPageTitle, toLocalTime } from '../../shared/util'
import { adminStore, presetStore, toastStore, userStore } from '../../store'
import Select from '/web/shared/Select'
import { A } from '@solidjs/router'
import { elapsedSince, getUserSubscriptionTier, now } from '/common/util'
import type Stripe from 'stripe'
import { Page } from '/web/Layout'
import { createStore } from 'solid-js/store'
import { Copy } from '/web/shared/Copy'
import { AppSchema } from '/common/types'
import { RelativeSpinner } from '/web/shared/Loading'

const UsersPage: Component = () => {
  let ref: any
  setComponentPageTitle('Users')
  const state = adminStore((s) => ({ users: s.users }))
  const config = userStore((s) => ({ tiers: s.tiers }))

  const [code, setCode] = createSignal<AppSchema.User>()
  const [info, setInfo] = createSignal<{ name: string; id: string }>()
  const [store, setStore] = createStore({ username: '', subscribed: false, customerId: '' })
  const [loading, setLoading] = createSignal(false)

  const loadInfo = (id: string, name: string) => {
    setInfo({ id, name })
    adminStore.getInfo(id)
  }

  const search = async () => {
    setLoading(true)
    await adminStore.getUsers(store)
    setLoading(false)
  }

  onMount(() => {
    presetStore.getSubscriptions()
    userStore.getTiers()
  })

  const subTiers = createMemo(() => {
    const base = [{ label: '[-1] None', value: '-1' }]
    const tiers =
      config.tiers.map((tier) => ({
        label: `[${tier.level}] ${tier.name} ${!tier.enabled ? '(disabled)' : ''}`,
        value: tier._id,
      })) || []
    return base.concat(tiers).sort((l, r) => +l.value - +r.value)
  })

  return (
    <Page>
      <PageHeader title="User Management" />

      <A href="/admin/metrics" class="link">
        ← Back to Manage
      </A>

      <div class="flex flex-col gap-2 pb-4">
        <form ref={ref} class="flex justify-between">
          <div class="flex flex-wrap gap-2">
            <TextInput
              class="text-xs"
              placeholder="Username"
              onChange={(ev) => setStore('username', ev.currentTarget.value)}
              onKeyUp={(ev) => (ev.key === 'Enter' ? search() : null)}
            />
            <TextInput
              class="text-xs"
              fieldName="customerId"
              placeholder="Customer ID"
              onChange={(ev) => setStore('customerId', ev.currentTarget.value)}
              onKeyUp={(ev) => (ev.key === 'Enter' ? search() : null)}
            />
            <ToggleButton
              size="sm"
              fieldName="subscribed"
              onChange={(ev) => setStore('subscribed', ev)}
            >
              Subscribed
            </ToggleButton>
          </div>
          <Button size="sm" onClick={search} disabled={loading()}>
            <Show when={!loading()} fallback={<RelativeSpinner size={20} />}>
              Search
            </Show>
          </Button>
        </form>
        <For each={state.users}>
          {(user) => (
            <div class="bg-800 flex h-12 flex-row items-center gap-2 rounded-xl hover:bg-[var(--hl-600)]">
              <div class="flex w-6/12 px-2">
                <div class="flex flex-col gap-0.5">
                  <div>{user.username}</div>
                  <div class="text-600 text-[0.5rem]">{user._id}</div>
                </div>
              </div>
              <div class="flex w-6/12 justify-end gap-2 pr-2">
                <Select
                  class="text-xs"
                  fieldName="subTier"
                  value={getUserSubscriptionTier(user, config.tiers)?.tier._id || ''}
                  items={subTiers()}
                  disabled
                  onChange={(ev) => {
                    adminStore.changeUserTier(user._id, ev.value)
                  }}
                />
                <Button size="sm" onClick={() => setCode(user)}>
                  Reset
                </Button>
                <Button size="sm" onClick={() => loadInfo(user._id, user.username)}>
                  Info
                </Button>
                <Button size="sm" onClick={() => adminStore.impersonate(user._id)}>
                  <HatGlasses size={20} />
                </Button>
              </div>
            </div>
          )}
        </For>
        <PasswordModal show={!!code()} close={() => setCode(undefined)} user={code()} />
        <InfoModel
          show={!!info()}
          close={() => setInfo()}
          userId={info()?.id!}
          name={info()?.name!}
        />
      </div>
    </Page>
  )
}

export default UsersPage

const InfoModel: Component<{ show: boolean; close: () => void; userId: string; name: string }> = (
  props
) => {
  let subId: any
  const state = adminStore((s) => ({ info: s.info }))
  const tiers = userStore((s) => ({ list: s.tiers }))
  const [session, setSession] = createSignal<Stripe.Checkout.Session>()
  const [manualId, setManualId] = createSignal(state.info?.manualSub?.tierId || '')
  const [expiry, setExpiry] = createSignal(new Date(state.info?.manualSub?.expiresAt || now()))
  const [ban, setBan] = createSignal(false)

  const subTiers = createMemo(() => {
    const base = [{ label: '[-1] None', value: '-1' }]
    const list =
      tiers.list.map((tier) => ({
        label: `[${tier.level}] ${tier.name} ${!tier.enabled ? '(disabled)' : ''}`,
        value: tier._id,
      })) || []

    return base.concat(list).sort((l, r) => +l.value - +r.value)
  })

  const assignSub = () => {
    const id = subId.value
    if (!id) {
      return toastStore.error(`No subscription ID`)
    }

    adminStore.assignSubscription(props.userId, id)
  }

  return (
    <>
      <Modal
        show={props.show}
        close={props.close}
        title={`${props.name}: ${state.info?.handle || '...'}`}
        footer={<Button onClick={props.close}>Close</Button>}
        maxWidth="half"
      >
        <div class="flex flex-col items-center gap-4">
          <Show when={state.info?.avatar}>
            <div class="flex w-full justify-center">
              <img src={getAssetUrl(state.info?.avatar!)} class="h-[128px]" />
            </div>
          </Show>

          <div class="flex gap-2">
            <Button size="sm" onClick={() => adminStore.impersonate(state.info?.userId!)}>
              Impersonate
            </Button>
            <Button disabled={!!state.info?.banned} size="sm" onClick={() => setBan(true)}>
              Ban User
            </Button>

            <Button
              disabled={!state.info?.banned}
              size="sm"
              onClick={() => adminStore.unbanUser(props.userId)}
            >
              Unban User
            </Button>
          </div>

          <table class="w-full table-auto">
            <tbody>
              <tr>
                <th>User ID</th>
                <td>{state.info?.userId}</td>
              </tr>

              <Show when={state.info?.banned}>
                <th>Banned</th>
                <td>
                  {new Date(state.info?.banned?.at!).toDateString()}:{' '}
                  {state.info?.banned?.reason || 'No reason given'}
                </td>
              </Show>

              <tr>
                <th>Handle</th>
                <td>{state.info?.handle}</td>
              </tr>

              <tr>
                <th>Characters</th>
                <td>{state.info?.characters}</td>
              </tr>
              <tr>
                <th>Chats</th>
                <td>{state.info?.chats}</td>
              </tr>

              <tr>
                <td colSpan={2}>
                  <div class="bg-700 mt-4 flex justify-center">Subscription Details</div>
                </td>
              </tr>
              <tr>
                <th>Gift</th>
                <td>
                  <div class="flex gap-1">
                    <Select
                      class="text-sm"
                      fieldName="manualId"
                      items={subTiers()}
                      onChange={(ev) => setManualId(ev.value)}
                      value={state.info?.manualSub?.tierId}
                    />
                    <TextInput
                      parentClass="text-xs"
                      fieldName="expiry"
                      type="datetime-local"
                      value={toLocalTime(expiry().toISOString())}
                      onChange={(ev) => setExpiry(new Date(ev.currentTarget.value))}
                    />
                    <Button
                      onClick={() => adminStore.assignGift(props.userId, manualId(), expiry())}
                      size="sm"
                      class="h-[36px]"
                    >
                      Apply
                    </Button>
                  </div>
                </td>
              </tr>
              <tr>
                <th>Assign Sub</th>
                <td>
                  <div class="flex gap-1">
                    <TextInput
                      ref={subId}
                      parentClass="w-full"
                      fieldName="subscriptionId"
                      placeholder="Stripe Subscription ID"
                    />
                    <Button onClick={assignSub}>Assign</Button>
                  </div>
                </td>
              </tr>
              <Show when={state.info?.stripeSessions?.length}>
                <tr>
                  <th>Session IDs</th>
                  <td class="flex flex-wrap items-center gap-1">
                    <For each={state.info?.stripeSessions}>
                      {(id) => (
                        <Button size="pill" onClick={() => adminStore.viewSession(id, setSession)}>
                          {id.slice(8, 16)}...
                        </Button>
                      )}
                    </For>
                  </td>
                </tr>
              </Show>
              <tr>
                <th>Subscription Level</th>
                <td>
                  Native:{state.info?.sub?.level ?? '-1'} / Patreon:
                  {state.info?.patreon?.sub?.level ?? '-1'} / Manual:
                  {state.info?.manualSub?.level ?? '-1'}
                </td>
              </tr>

              <Show when={state.info?.billing}>
                <tr>
                  <th>Customer ID</th>
                  <td>{state.info?.billing?.customerId}</td>
                </tr>

                <tr>
                  <th>Period Start</th>
                  <td>{new Date(state.info?.billing?.lastRenewed!).toLocaleString()}</td>
                </tr>

                <tr>
                  <th>
                    {state.info?.state.downgrade
                      ? 'Downgrading at'
                      : state.info?.state.state === 'cancelled'
                      ? 'Cancelled at'
                      : state.info?.billing?.cancelling
                      ? 'Cancels at'
                      : 'Renews at'}
                  </th>
                  <td>{new Date(state.info?.billing?.validUntil!).toLocaleString()}</td>
                </tr>
              </Show>

              <Show when={state.info?.state.history.length ?? 0 > 0}>
                <tr>
                  <th>State</th>
                  <td>{state.info?.state.state}</td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <div class="bg-700 mt-4 flex justify-center">History</div>
                  </td>
                </tr>
                <For each={state.info?.state.history}>
                  {(item) => {
                    const tier = item.tierId
                      ? tiers.list.find((t) => t._id === item.tierId)
                      : undefined
                    return (
                      <tr>
                        <th class="flex flex-col">
                          <div>{new Date(item.time).toLocaleString()} </div>
                          <div class="text-500 text-xs">
                            {elapsedSince(new Date(item.time!))} ago
                          </div>
                        </th>
                        <td>
                          {item.type}{' '}
                          <span class="text-[var(--hl-700)]">
                            {tier ? `(tier #${tier.level} ${tier.name})` : ''}
                          </span>
                        </td>
                      </tr>
                    )
                  }}
                </For>
              </Show>
              <Show when={!!session()}>
                <tr>
                  <td colSpan={2}>
                    <div class="bg-700 mt-4 flex justify-center">Session: {session()?.id}</div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <pre class="max-w-[800px] text-xs">{JSON.stringify(session(), null, 2)}</pre>
                  </td>
                </tr>
              </Show>
            </tbody>
          </table>
        </div>
      </Modal>

      <BanModal show={ban()} close={() => setBan(false)} userId={props.userId} />
    </>
  )
}

const BanModal: Component<{ userId: string; show: boolean; close: () => void }> = (props) => {
  const [reason, setReason] = createSignal('')

  const ban = () => {
    if (!reason()) return

    adminStore.banUser(props.userId, reason())
    props.close()
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      footer={
        <>
          <Button onClick={props.close} schema="secondary">
            Cancel
          </Button>
          <Button schema="red" disabled={!reason().trim()} onClick={ban}>
            Ban
          </Button>
        </>
      }
    >
      <TextInput label="Ban Reason" onChange={(ev) => setReason(ev.currentTarget.value)} />
    </Modal>
  )
}

const PasswordModal: Component<{ user?: AppSchema.User; show: boolean; close: () => void }> = (
  props
) => {
  const [code, setCode] = createSignal('')

  const url = createMemo(() => `${location.origin}/recovery?code=${code()}`)

  const resetPassword = () => {
    if (!props.user) return

    adminStore.generateResetCode(props.user._id, (code) => {
      setCode(code)
    })
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title="Change Password"
      footer={
        <>
          {' '}
          <Button
            schema="secondary"
            onClick={() => {
              setCode('')
              props.close()
            }}
          >
            <X /> Close
          </Button>
          <Button schema="warning" onClick={resetPassword}>
            Reset
          </Button>
        </>
      }
    >
      <div class="flex flex-col items-center gap-2">
        <div>Reset Link: {props.user?.username}</div>

        <Show when={!code()}>
          <div class="link" onClick={resetPassword}>
            Generate Link
          </div>
        </Show>

        <Show when={code()}>
          <div class="flex cursor-pointer gap-2 font-bold">
            {url()} <Copy text={url()} />
          </div>
        </Show>
      </div>
    </Modal>
  )
}
