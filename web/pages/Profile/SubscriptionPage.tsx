import { Component, For, Match, Show, Switch, createMemo, createSignal, onMount } from 'solid-js'
import { userStore } from '/web/store'
import { AppSchema } from '/common/types'
import { SolidCard } from '/web/shared/Card'
import Button from '/web/shared/Button'
import { TierCard } from './TierCard'
import { ConfirmModal } from '/web/shared/Modal'

export const SubscriptionPage: Component = (props) => {
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

          <div class="flex justify-center">All prices are in USD</div>

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
