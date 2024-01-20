import { Component, For, Match, Show, Switch, createMemo, createSignal, onMount } from 'solid-js'
import { userStore } from '/web/store'
import { AppSchema } from '/common/types'
import { Pill, SolidCard } from '/web/shared/Card'
import Button from '/web/shared/Button'
import { TierCard } from './TierCard'
import { ConfirmModal } from '/web/shared/Modal'
import { PatreonControls } from '../Settings/PatreonOauth'
import { getUserSubscriptionTier } from '/common/util'
import { useTransContext } from '@mbarzda/solid-i18next'

export const SubscriptionPage: Component = (props) => {
  const [t] = useTransContext()

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

  const [showUnsub, setUnsub] = createSignal(false)
  const [showUpgrade, setUpgrade] = createSignal<AppSchema.SubscriptionTier>()
  const [showDowngrade, setDowngrade] = createSignal<AppSchema.SubscriptionTier>()

  const hasExpired = createMemo(() => {
    if (cfg.type === 'patreon' || cfg.type === 'manual') return false
    // if (!user.user?.billing?.cancelling) return false
    if (!user.user?.billing) return true
    const threshold = new Date(user.user.billing.validUntil)
    return threshold.valueOf() < Date.now()
  })

  const candidates = createMemo(() => {
    return cfg.tiers
      .filter((t) => {
        const isPatronOf = cfg.type === 'patreon' && cfg.tier?._id === t._id
        if (isPatronOf) return false

        const usable = t.level === cfg.level ? hasExpired() : true
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
    if (cfg.type === 'manual') return t('valid_until')
    if (cfg.type === 'patreon') return t('patreon_subscriber')

    if (user.user?.billing?.status === 'active') {
      if (user.user?.billing?.cancelling) return t('cancels_at')
      return t('renews_at')
    }
    return t('valid_until')
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
            <p class="flex flex-wrap justify-center text-[var(--hl-500)]">
              <strong>{t('why_subscribe?')}</strong>
            </p>
            <p>{t('why_subscribe_benefit_1')}</p>
            <p>{t('why_subscribe_benefit_2')}</p>
            <p>{t('why_subscribe_benefit_3', { app_name: t('app_name') })}</p>
          </SolidCard>

          <PatreonControls />

          <Show when={cfg.tier && !hasExpired()}>
            <h3 class="font-bold">{t('current_subscription')}</h3>
            <TierCard tier={cfg.tier!}>
              <div class="flex flex-col items-center gap-2">
                <div class="text-700 text-sm italic">
                  {currentText()} {renews()}
                </div>
                <Pill type="green">
                  {t('subscribed_via_x', {
                    name:
                    cfg.type === 'manual'
                        ? t('gift')
                        : cfg.type === 'patreon'
                        ? t('patreon')
                        : cfg.type === 'native'
                        ? t('stripe')
                        : 'None',
                  })}
                </Pill>
                <Switch>
                  <Match when={cfg.downgrade && cfg.tier!._id !== cfg.downgrade}>
                    {t('subscription_downgrade')}
                    <Button
                      schema="green"
                      onClick={() => userStore.modifySubscription(cfg.tier?._id!)}
                      disabled={user.billingLoading}
                    >
                      {t('cancel_downgrade')}
                    </Button>
                  </Match>
                  <Match when={canResume()}>
                    {t('your_subscription_is_currently_scheduled_to_cancel')}
                    <Button
                      schema="green"
                      onClick={userStore.resumeSubscription}
                      disabled={user.billingLoading}
                    >
                      {t('resume_subscription')}
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
                      {t('subscribed!')}
                    </SolidCard>
                  </Match>
                </Switch>
              </div>
            </TierCard>
          </Show>

          <Show when={candidates().length > 0}>
            <div class="font-bold">{t('subscription_options')}</div>
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
                        <Match when={cfg.tier && cfg.level < each.level}>
                          <Button
                            schema="success"
                            disabled={canResume() || user.billingLoading}
                            onClick={() => setUpgrade(each)}
                          >
                            {t('upgrade')}
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
                            {t('downgrading')}
                          </Button>
                        </Match>

                        <Match when={!hasExpired() && cfg.tier && cfg.level > each.level}>
                          <Button
                            schema="gray"
                            disabled={canResume() || user.billingLoading}
                            onClick={() => setDowngrade(each)}
                          >
                            {t('downgrade')}
                          </Button>
                        </Match>

                        <Match when={hasExpired() && each._id === cfg.tier?._id}>
                          <Button schema="success" onClick={() => onSubscribe(each._id)}>
                            {t('resubscribe')}
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
                            {t('subscribe')}
                          </Button>
                        </Match>
                      </Switch>
                    </div>
                  </TierCard>
                </>
              )}
            </For>
          </div>

          <div class="flex justify-center">{t('all_prices_are_in_usd')}</div>

          <div class="mt-4 flex gap-4">
            {/* <Button onClick={userStore.validateSubscription} disabled={user.billingLoading}>
              Validate
            </Button> */}
            <Show when={cfg.tier && !hasExpired()}>
              <Button schema="red" onClick={() => setUnsub(true)} disabled={user.billingLoading}>
                {t('unsubscribe')}
              </Button>
            </Show>
          </div>
        </div>
      </div>
      <ConfirmModal
        show={showUnsub()}
        close={() => setUnsub(false)}
        message={t('are_you_sure_you_wish_to_unsubscribe?')}
        confirm={userStore.stopSubscription}
      />

      <ConfirmModal
        show={!!showUpgrade()}
        close={() => setUpgrade()}
        message={
          <div class="flex flex-col items-center justify-center gap-2">
            <p>{t('you_will_be_immediately_charged_upon_confirm')}</p>
            <p>{t('are_you_sure_you_wish_to_upgrade_now?')}</p>
          </div>
        }
        confirm={() => userStore.modifySubscription(showUpgrade()!._id)}
      />

      <ConfirmModal
        show={!!showDowngrade()}
        close={() => setDowngrade()}
        message={
          <div class="flex flex-col items-center justify-center gap-2">
            <p>{t('your_downgrade_will_take_effect_message')}</p>
            <p>{t('are_you_sure_you_wish_to_upgrade?')}</p>
          </div>
        }
        confirm={() => userStore.modifySubscription(showDowngrade()!._id)}
      />
    </>
  )
}
