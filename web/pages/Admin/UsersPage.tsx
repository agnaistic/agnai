import { Save, X } from 'lucide-solid'
import { Component, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import Button, { ToggleButton } from '../../shared/Button'
import Modal from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getAssetUrl, getStrictForm, setComponentPageTitle, toLocalTime } from '../../shared/util'
import { adminStore, presetStore, toastStore, userStore } from '../../store'
import { AppSchema } from '/common/types'
import Select from '/web/shared/Select'
import { A } from '@solidjs/router'
import { elapsedSince, getUserSubscriptionTier, now } from '/common/util'
import type Stripe from 'stripe'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'


const UsersPage: Component = () => {
  const [t] = useTransContext()

  let ref: any
  setComponentPageTitle(t('users'))
  const state = adminStore()
  const config = userStore()

  const [pw, setPw] = createSignal<AppSchema.User>()
  const [info, setInfo] = createSignal<{ name: string; id: string }>()

  const loadInfo = (id: string, name: string) => {
    setInfo({ id, name })
    adminStore.getInfo(id)
  }

  const search = (ev: Event) => {
    ev?.preventDefault()
    const opts = getStrictForm(ref, {
      username: 'string',
      subscribed: 'boolean',
      customerId: 'string',
    })
    adminStore.getUsers(opts)
  }

  onMount(() => {
    adminStore.getUsers({ username: '', subscribed: false, customerId: '' })
    presetStore.getSubscriptions()
    userStore.getTiers()
  })

  const subTiers = createMemo(() => {
    const base = [{ label: t('[-1]_none'), value: '-1' }]
    const tiers =
      config.tiers.map((tier) => ({
        label: `[${tier.level}] ${tier.name} ${!tier.enabled ? t('(disabled)') : ''}`,
        value: tier._id,
      })) || []
    return base.concat(tiers).sort((l, r) => +l.value - +r.value)
  })

  return (
    <div>
      <PageHeader title={t('user_management')} />

      <A href="/admin/metrics" class="link">
        {t('back_to_manage')}
      </A>

      <div class="flex flex-col gap-2 pb-4">
        <form ref={ref} class="flex justify-between" onSubmit={search}>
          <div class="flex flex-wrap gap-2">
            <TextInput class="text-xs" fieldName="username" placeholder={t('username')} />
            <TextInput class="text-xs" fieldName="customerId" placeholder={t('customer_id')} />
            <ToggleButton fieldName="subscribed">{t('subscribed')}</ToggleButton>
          </div>
          <Button onClick={search}>{t('search')}</Button>
        </form>
        <For each={state.users}>
          {(user) => (
            <div class="bg-800 flex h-12 flex-row items-center gap-2 rounded-xl">
              <div class="flex w-6/12 px-2">
                <div>
                  <span class="text-600 text-[0.5rem]">{user._id}</span> {user.username}
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
                <Button size="sm" onClick={() => setPw(user)}>
                  {t('set_password')}
                </Button>
                <Button size="sm" onClick={() => loadInfo(user._id, user.username)}>
                  {t('info')}
                </Button>
              </div>
            </div>
          )}
        </For>
        <PasswordModal show={!!pw()} user={pw()!} close={() => setPw(undefined)} />
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

  let subId: any

  const [t] = useTransContext()

  const state = adminStore()
  const tiers = userStore((s) => ({ list: s.tiers }))
  const [session, setSession] = createSignal<Stripe.Checkout.Session>()
  const [manualId, setManualId] = createSignal(state.info?.manualSub?.tierId || '')
  const [expiry, setExpiry] = createSignal(new Date(state.info?.manualSub?.expiresAt || now()))

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
    <Modal
      show={props.show}
      close={props.close}
      title={`${props.name}: ${state.info?.handle || '...'}`}
      footer={<Button onClick={props.close}>{t('close')}</Button>}
      maxWidth="half"
    >
      <div class="flex flex-col items-center gap-4">
        <Show when={state.info?.avatar}>
          <div class="flex w-full justify-center">
            <img src={getAssetUrl(state.info?.avatar!)} class="h-[128px]" />
          </div>
        </Show>
        <Button onClick={() => adminStore.impersonate(state.info?.userId!)}>
          {t('impersonate')}
        </Button>
        <table class="w-full table-auto">
          <tbody>
            <tr>
              <th>{t('user_id')}</th>
              <td>{state.info?.userId}</td>
            </tr>

            <tr>
              <th>{t('handle')}</th>
              <td>{state.info?.handle}</td>
            </tr>

            <tr>
              <th>{t('characters')}</th>
              <td>{state.info?.characters}</td>
            </tr>
            <tr>
              <th>{t('chats')}</th>
              <td>{state.info?.chats}</td>
            </tr>

            <tr>
              <td colSpan={2}>
                <div class="bg-700 mt-4 flex justify-center">{t('subscription_details')}</div>
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
                    value={toLocalTime(state.info?.manualSub?.expiresAt || now())}
                    onChange={(ev) => setExpiry(new Date(ev.currentTarget.value))}
                  />
                  <Button onClick={() => adminStore.assignGift(props.userId, manualId(), expiry())}>
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
                <td>
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
              <th>{t('subscription_level')}</th>
              <td>
                {t('native_x_or_patreon_x', {
                  sub_level: state.info?.sub?.level ?? '-1',
                  patreon_sub_level: state.info?.patreon?.sub?.level ?? '-1',
                })}
              </td>
            </tr>

            <Show when={state.info?.billing}>
              <tr>
                <th>{t('customer_id')}</th>
                <td>{state.info?.billing?.customerId}</td>
              </tr>

              <tr>
                <th>{t('period_start')}</th>
                <td>{new Date(state.info?.billing?.lastRenewed!).toLocaleString()}</td>
              </tr>

              <tr>
                <th>
                  {state.info?.state.downgrade
                    ? t('downgrading_at')
                    : state.info?.state.state === 'cancelled'
                    ? t('canceled_at')
                    : state.info?.billing?.cancelling
                    ? t('cancels_at')
                    : t('renews_at')}
                </th>
                <td>{new Date(state.info?.billing?.validUntil!).toLocaleString()}</td>
              </tr>
            </Show>

            <Show when={state.info?.state.history.length ?? 0 > 0}>
              <tr>
                <th>{t('state')}</th>
                <td>{state.info?.state.state}</td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <div class="bg-700 mt-4 flex justify-center">{t('history')}</div>
                </td>
              </tr>
              <For each={state.info?.state.history}>
                {(item) => {
                  const tier = item.tierId
                    ? tiers.list.find((t) => t._id === item.tierId)
                    : undefined
                  return (
                    <tr>
                      <th>
                        {new Date(item.time).toLocaleString()}{' '}
                        <span class="text-500 text-xs">
                          {t('x_ago', { time: elapsedSince(new Date(item.time!)) })}
                        </span>
                      </th>
                      <td>
                        {item.type}{' '}
                        <span class="text-[var(--hl-700)]">
                          {tier
                            ? t('tier_level_x_name_x', {
                                level: tier.level,
                                name: tier.name,
                              })
                            : ''}
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
                  <pre class="text-xs">{JSON.stringify(session(), null, 2)}</pre>
                </td>
              </tr>
            </Show>
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

const PasswordModal: Component<{ user: AppSchema.User; show: boolean; close: () => void }> = (
  props
) => {
  const [t] = useTransContext()

  let ref: any
  const save = () => {
    const body = getStrictForm(ref, { newPassword: 'string' })
    adminStore.setPassword(props.user._id, body.newPassword, props.close)
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title={t('change_password')}
      footer={
        <>
          {' '}
          <Button schema="secondary" onClick={props.close}>
            <X /> {t('cancel')}
          </Button>
          <Button onClick={save}>
            <Save /> {t('update')}
          </Button>
        </>
      }
    >
      <div>
        <Trans key="update_password_for_x" options={{ username: props.user.username }}>
          Update password for: <b>{'{{username}}'}</b>
        </Trans>
      </div>
      <div>
        <form ref={ref}>
          <TextInput type="password" fieldName="newPassword" required />
        </form>
      </div>
    </Modal>
  )
}
