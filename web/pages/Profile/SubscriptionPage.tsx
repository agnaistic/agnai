import { Component, For, Match, Show, Switch, createMemo, createSignal, onMount } from 'solid-js'
import { settingStore, userStore } from '/web/store'
import { AppSchema } from '/common/types'
import { Pill, SolidCard, TitleCard } from '/web/shared/Card'
import Button from '/web/shared/Button'
import { TierCard } from './TierCard'
import { ConfirmModal } from '/web/shared/Modal'
import { PatreonControls } from '../Settings/PatreonOauth'
import { getUserSubscriptionTier } from '/common/util'
import { isLoggedIn } from '/web/store/api'
import { useNavigate } from '@solidjs/router'
import { ModelList } from '/web/shared/PresetSettings/Agnaistic'

export const SubscriptionPage: Component<{}> = (props) => {
  const settings = settingStore((s) => s.config)
  const user = userStore()
  const cfg = userStore((s) => {
    const tier = s.user ? getUserSubscriptionTier(s.user, s.tiers) : null

    return {
      type: tier?.type ?? 'none',
      tier: tier?.tier,
      level: tier?.level ?? -1,
      tiers: s.tiers.sort((l, r) => r.level - l.level),
      downgrade: s.subStatus?.downgrading?.tierId,
    }
  })

  const nav = useNavigate()
  const [showUnsub, setUnsub] = createSignal(false)
  const [showUpgrade, setUpgrade] = createSignal<AppSchema.SubscriptionTier>()
  const [showDowngrade, setDowngrade] = createSignal<AppSchema.SubscriptionTier>()
  const [showModels, setShowModels] = createSignal(false)

  const hasExpired = createMemo(() => {
    // We should leave this out. It's possible a user can subscribe multiple ways
    // if (cfg.type === 'patreon' || cfg.type === 'manual') return true

    // if (!user.user?.billing?.cancelling) return false
    if (!user.user?.billing) return true
    if (user.user.billing.status === 'cancelled') return true

    const threshold = new Date(user.user.billing.validUntil)
    return threshold.valueOf() < Date.now()
  })

  const candidates = createMemo(() => {
    return cfg.tiers
      .filter((t) => {
        const isPatronOf = user.sub?.type === 'patreon' && cfg.tier?._id === t._id
        isPatronOf
        // if (isPatronOf) return false

        const usable = t.level !== user.sub?.level
        return usable && t.enabled && !t.deletedAt && !!t.productId
      })
      .sort((l, r) => l.level - r.level)
  })

  const renews = createMemo(() => {
    if (cfg.type === 'manual') {
      const last = new Date(user.user?.manualSub?.expiresAt!)
      return last.toLocaleDateString()
    }
    if (!user.user?.billing) return ''
    if (cfg.type === 'patreon') return ''
    const last = new Date(user.user.billing.validUntil)
    return last.toLocaleDateString()
  })

  const onSubscribe = (tierId: string) => {
    userStore.startCheckout(tierId)
  }

  const currentText = createMemo(() => {
    if (cfg.type === 'manaul') return 'Valid until'
    if (cfg.type === 'patreon') return `Patreon Subscriber`

    if (user.user?.billing?.status === 'active') {
      if (user.user?.billing?.cancelling) return 'Cancels at'
      return `Renews at`
    }
    return 'Valid until'
  })

  const canResume = createMemo(() => {
    if (!user.user?.billing?.cancelling) return false
    if (user.user.billing.status === 'cancelled') return false

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
            <p class="flex flex-wrap justify-center text-[var(--hl-500)]">
              <strong>Why subscribe?</strong>
            </p>
            <p>
              Subscribing grants you access to higher quality models, quicker responses, and larger
              contexts.
            </p>
            <p>
              In the future you'll also have access to additional features! Such as: voice
              generation, image storage, and with integration third-party apps like Discord, Slack,
              and WhatsApp, and more!
            </p>
            <p>Subscribing allows me to spend more time developing and enhancing Agnaistic.</p>
          </SolidCard>

          <Show when={settings.serverConfig?.supportEmail}>
            <SolidCard>
              If you require billing or subscription support contact{' '}
              <a class="link" href={`mailto:${settings.serverConfig?.supportEmail}`}>
                {settings.serverConfig?.supportEmail}
              </a>
            </SolidCard>
          </Show>

          <Button schema="primary" onClick={() => setShowModels(true)}>
            View Available Models
          </Button>

          <PatreonControls />

          <Show when={user.sub?.level! > 0}>
            <h3 class="font-bold">Current Subscription</h3>
            <Show when={user.user?.billing}>
              <a class="link" href={settings.serverConfig?.stripeCustomerPortal} target="_blank">
                Update Payment Method
              </a>
            </Show>
            <TierCard tier={cfg.tier!}>
              <div class="flex flex-col items-center gap-2">
                <div class="text-700 text-sm italic">
                  {currentText()} {renews()}
                </div>
                <Pill type="green">
                  Subscribed via{' '}
                  {user.sub?.type === 'manual'
                    ? 'Gift'
                    : user.sub?.type === 'patreon'
                    ? 'Patreon'
                    : user.sub?.type === 'native'
                    ? 'Stripe'
                    : 'None'}
                </Pill>
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
                  <Match when={cfg.type === 'manual'}>
                    <SolidCard
                      bg="bg-700"
                      class="flex w-1/2 justify-center text-lg font-bold text-[var(--green-600)]"
                    >
                      Enjoy!
                    </SolidCard>
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
            <div class="font-bold">Subscription Options</div>
          </Show>

          <Show when={settings.patreon}>
            <TitleCard center title={<span class="text-[var(--hl-500)]">Patreon</span>}>
              Become a{' '}
              <a class="link font-bold" href="https://patreon.com/Agnaistic" target="_blank">
                Patron
              </a>{' '}
              and link your account or use the options below
            </TitleCard>
          </Show>

          <div class="flex w-full flex-wrap justify-center gap-4">
            <For each={candidates()}>
              {(each) => (
                <>
                  <TierCard tier={each} class="sm:w-1/3">
                    <Show when={user.user?.manualSub?.tierId === each._id}>
                      <Pill type="green">This tier is currently gifted to you</Pill>
                    </Show>
                    <div class="mt-4 flex justify-center">
                      <Switch>
                        <Match when={!isLoggedIn()}>
                          <Button schema="success" onClick={() => nav('/login')}>
                            Login to Subcribe
                          </Button>
                        </Match>
                        <Match when={user.sub?.tier._id === each._id}>
                          <Button schema="success" disabled>
                            Subscribed!
                          </Button>
                        </Match>
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
                          when={
                            user.sub?.tier &&
                            user.sub.level > each.level &&
                            each._id === cfg.downgrade
                          }
                        >
                          <Button
                            schema="gray"
                            disabled
                            onClick={() => userStore.modifySubscription(each._id)}
                          >
                            Downgrading...
                          </Button>
                        </Match>

                        <Match when={user.sub?.type === 'native' && user.sub.level > each.level}>
                          <Button
                            schema="gray"
                            disabled={canResume() || user.billingLoading}
                            onClick={() => setDowngrade(each)}
                          >
                            Downgrade
                          </Button>
                        </Match>

                        <Match when={hasExpired() && each._id === user.sub?.tier._id}>
                          <Button schema="success" onClick={() => onSubscribe(each._id)}>
                            Re-subscribe
                          </Button>
                        </Match>

                        <Match when={user.sub?.level! > each.level}>
                          <Button schema="secondary" disabled onClick={() => onSubscribe(each._id)}>
                            Subscribe
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

          <div class="flex justify-center">All prices are in USD</div>

          <div class="mt-4 flex gap-4">
            {/* <Button onClick={userStore.validateSubscription} disabled={user.billingLoading}>
              Validate
            </Button> */}
            <Show when={cfg.tier && !hasExpired()}>
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

      <ModelList show={showModels()} close={() => setShowModels(false)} />
    </>
  )
}
