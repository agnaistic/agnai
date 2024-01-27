import './home.scss'
import { Component, For, Match, Show, Switch, createSignal, onMount } from 'solid-js'
import { adaptersToOptions, getAssetUrl, setComponentPageTitle } from '../../shared/util'
import { announceStore, chatStore, settingStore } from '../../store'
import { A, useNavigate } from '@solidjs/router'
import { AlertTriangle, MoveRight, Plus, Settings } from 'lucide-solid'
import { Card, Pill, SolidCard, TitleCard } from '/web/shared/Card'
import Modal from '/web/shared/Modal'
import AvatarIcon from '/web/shared/AvatarIcon'
import { elapsedSince } from '/common/util'
import { AppSchema } from '/common/types'
import { markdown } from '/web/shared/markdown'
import WizardIcon from '/web/icons/WizardIcon'
import Slot from '/web/shared/Slot'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const enum Sub {
  None,
  OpenAI,
  NovelAI,
  Horde,
}

const HomePage: Component = () => {
  const [t] = useTransContext()

  let ref: any
  setComponentPageTitle(t('information'))
  const [sub, setSub] = createSignal(Sub.None)

  const closeSub = () => setSub(Sub.None)

  const cfg = settingStore((cfg) => ({
    adapters: adaptersToOptions(cfg.config.adapters),
    guest: cfg.guestAccessAllowed,
    config: cfg.config,
  }))

  const announce = announceStore()

  onMount(() => {
    announceStore.getAll()
  })

  return (
    <div>
      <Show when={!cfg.guest}>
        <div class="flex text-orange-500" role="alert">
          <AlertTriangle class="mb-2 mr-2" aria-hidden="true" />
          {t('your_browser_does_not_support_local_storage', { app_name: t('app_name') })}
        </div>
      </Show>

      <div class="flex flex-col gap-4 text-lg">
        <div
          class="hidden justify-center text-6xl sm:flex"
          role="heading"
          aria-level="1"
          aria-labelledby="homeTitle"
        >
          <span id="homeTitle" aria-hidden="true">
            Agn<span class="text-[var(--hl-500)]">ai</span>
          </span>
        </div>

        <div class="w-full" ref={ref}>
          <Slot slot="leaderboard" parent={ref} />
        </div>

        <Show when={cfg.config.patreon}>
          <TitleCard
            type="hl"
            class="flex w-full items-center"
            ariaRole="region"
            ariaLabel={t('models')}
          >
            <Trans key="agnaistic_now_hosts_its_own_model">
              Agnaistic now hosts its own models! Use them for free by using the
              <span class="ml-2 mr-2 font-bold">Agnaistic</span> service in your presets
            </Trans>
          </TitleCard>
        </Show>

        <RecentChats />

        <Show when={announce.list.length > 0}>
          <Announcements list={announce.list} />
        </Show>

        <div class="home-cards">
          <TitleCard
            type="bg"
            title={t('guides')}
            class=""
            center
            ariaRole="region"
            ariaLabel="Guides"
          >
            <div class="flex flex-wrap justify-center gap-2">
              <a>
                <Pill inverse onClick={() => setSub(Sub.OpenAI)} ariaRole="link">
                  {t('open_ai')}
                </Pill>
              </a>
              <A href="/guides/novel">
                <Pill inverse>{t('novel_ai')}</Pill>
              </A>
              <a>
                <Pill inverse onClick={() => setSub(Sub.Horde)} ariaRole="link">
                  {t('horde')}
                </Pill>
              </a>
              <A href="/guides/memory">
                <Pill inverse>{t('memory_book')}</Pill>
              </A>
            </div>
          </TitleCard>

          <TitleCard type="bg" title={t('links')} center ariaRole="region" ariaLabel="Links">
            <div class="flex flex-wrap justify-center gap-2">
              <a href="/discord" target="_blank">
                <Pill inverse>{t('agnaistic_discord')}</Pill>
              </a>

              <A href="https://github.com/agnaistic/agnai" target="_blank">
                <Pill inverse>{t('github')}</Pill>
              </A>
            </div>
          </TitleCard>
        </div>

        <Show when={announce.list.length === 0}>
          <Features />
        </Show>

        <Card border ariaRole="region" ariaLabel="Getting started">
          <div class="mb-2 flex justify-center text-xl font-bold" aria-hidden="true">
            {t('getting_started')}
          </div>
          <div class="flex flex-col items-center gap-2 leading-6">
            <p>
              <Trans key="already_have_open_ai_message">
                Already have OpenAI, NovelAI, GooseAI, Scale, Claude? Head to the
                <A class="link" href="/settings?tab=ai">
                  Settings Page
                </A>
                and configure your AI service.
              </Trans>
            </p>
          </div>
        </Card>
      </div>

      <Switch>
        <Match when={sub() === Sub.Horde}>
          <HordeGuide close={closeSub} />
        </Match>

        <Match when={sub() === Sub.OpenAI}>
          <OpenAIGuide close={closeSub} />
        </Match>
      </Switch>
    </div>
  )
}

export default HomePage

const RecentChats: Component = (props) => {
  const [t] = useTransContext()

  const nav = useNavigate()
  const state = chatStore((s) => ({
    chars: s.allChars.list,
    last: s.allChats
      .slice()
      .sort((l, r) => (r.updatedAt > l.updatedAt ? 1 : -1))
      .slice(0, 4)
      .map((chat) => ({ chat, char: s.allChars.map[chat.characterId] })),
  }))

  return (
    <section class="flex flex-col" aria-labelledby="homeRecConversations">
      <div id="homeRecConversations" class="text-lg font-bold" aria-hidden="true">
        {t('recent_conversations')}
      </div>
      <div
        class="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
        classList={{ hidden: state.last.length === 0 }}
      >
        <For each={state.last}>
          {({ chat, char }) => (
            <>
              <div
                role="link"
                aria-label={t('Chat_with_char_x_time_x_chat_x', {
                  char_name: char.name,
                  time: elapsedSince(chat.updatedAt),
                  chat_name: chat.name,
                })}
                class="bg-800 hover:bg-700 hidden h-24 w-full cursor-pointer rounded-md border-[1px] border-[var(--bg-700)] transition duration-300 sm:flex"
                onClick={() => nav(`/chat/${chat._id}`)}
              >
                <Show when={char?.avatar}>
                  <AvatarIcon
                    noBorder
                    class="flex items-center justify-center"
                    format={{ corners: 'md', size: '3xl' }}
                    avatarUrl={getAssetUrl(char?.avatar || '')}
                  />
                </Show>

                <Show when={!char?.avatar}>
                  <div class="flex h-24 w-24 items-center justify-center">
                    <AvatarIcon
                      noBorder
                      format={{ corners: 'md', size: 'xl' }}
                      avatarUrl={getAssetUrl(char?.avatar || '')}
                    />
                  </div>
                </Show>

                <div class="flex w-full flex-col justify-between text-sm" aria-hidden="true">
                  <div class="flex flex-col px-1">
                    <div class="text-sm font-bold">{char.name}</div>
                    <div class="text-500 text-xs">
                      {t('x_ago', { time: elapsedSince(chat.updatedAt) })}
                    </div>
                    <Show when={chat.name}>
                      <p class="line-clamp-2 max-h-10 overflow-hidden text-ellipsis">{chat.name}</p>
                    </Show>
                  </div>
                  <div class="flex max-h-10 w-full items-center justify-end px-2">
                    {/* <div class="flex items-center"> */}
                    <MoveRight size={14} />
                    {/* </div> */}
                  </div>
                </div>
              </div>

              <div
                role="link"
                aria-label={t('Chat_with_char_x_time_x_chat_x', {
                  char_name: char.name,
                  time: elapsedSince(chat.updatedAt),
                  chat_name: chat.name,
                })}
                class="bg-800 hover:bg-700 flex w-full cursor-pointer flex-col rounded-md border-[1px] border-[var(--bg-700)] transition duration-300 sm:hidden"
                onClick={() => nav(`/chat/${chat._id}`)}
              >
                <div class="flex" aria-hidden="true">
                  <div class="flex items-center justify-center px-1 pt-1">
                    <AvatarIcon
                      noBorder
                      format={{ corners: 'circle', size: 'md' }}
                      avatarUrl={getAssetUrl(char?.avatar || '')}
                    />
                  </div>
                  <div class="flex flex-col overflow-hidden text-ellipsis whitespace-nowrap px-1">
                    <div class="overflow-hidden text-ellipsis text-sm font-bold">{char.name}</div>
                    <div class="text-500 text-xs">
                      {t('x_ago', { time: elapsedSince(chat.updatedAt) })}
                    </div>
                  </div>
                </div>

                <div class="flex h-full w-full flex-col justify-between text-sm" aria-hidden="true">
                  <p class="line-clamp-2 max-h-10 overflow-hidden text-ellipsis px-1">
                    {chat.name}
                  </p>

                  <div class="flex max-h-10 w-full items-center justify-end px-2">
                    {/* <div class="flex items-center"> */}
                    <MoveRight size={14} />
                    {/* </div> */}
                  </div>
                </div>
              </div>
            </>
          )}
        </For>
        <Show when={state.last.length < 4}>
          <BorderCard href="/chats/create" ariaLabel={t('start_conversation')}>
            <div aria-hidden="true">{t('start_conversation')}</div>
            <Plus size={20} aria-hidden="true" />
          </BorderCard>
        </Show>

        <Show when={state.last.length < 3}>
          <BorderCard href="/editor" ariaLabel={t('create_a_character')}>
            <div aria-hidden="true">{t('create_a_character')}</div>
            <WizardIcon size={20} aria-hidden="true" />
          </BorderCard>
        </Show>

        <Show when={state.last.length < 2}>
          <BorderCard href="/settings" ariaLabel={t('configure_your_ai_services')}>
            <div class="flex w-full items-center justify-center text-center" aria-hidden="true">
              {t('configure_your_ai_services')}
            </div>
            <Settings size={20} aria-hidden="true" />
          </BorderCard>
        </Show>
      </div>
    </section>
  )
}

const BorderCard: Component<{ children: any; href: string; ariaLabel?: string }> = (props) => {
  const nav = useNavigate()
  return (
    <div
      role="button"
      aria-label={props.ariaLabel}
      class="bg-800 text-700 hover:bg-600 flex h-24 w-full cursor-pointer flex-col items-center justify-center border-[2px] border-dashed border-[var(--bg-700)] text-center transition duration-300"
      onClick={() => nav(props.href)}
    >
      {props.children}
    </div>
  )
}

const Announcements: Component<{ list: AppSchema.Announcement[] }> = (props) => {
  const [t] = useTransContext()

  let ref: any
  return (
    <>
      <section class="flex flex-col gap-2" aria-labelledby="homeAnnouncements">
        <div
          id="homeAnnouncements"
          class="flex items-end font-bold leading-[14px]"
          aria-hidden="true"
        >
          {t('announcements')}
        </div>
        <For each={props.list}>
          {(item, i) => (
            <div class="rounded-md border-[1px] border-[var(--hl-500)]">
              <div class="flex flex-col rounded-t-md bg-[var(--hl-800)] p-2">
                <div class="text-lg font-bold" role="heading">
                  {item.title}
                </div>
                <div class="text-700 text-xs">
                  {t('x_ago', { time: elapsedSince(item.showAt) })}
                </div>
              </div>
              <div
                class="rendered-markdown bg-900 rounded-b-md p-2"
                innerHTML={markdown.makeHtml(item.content)}
              ></div>
            </div>
          )}
        </For>
        <div ref={ref} class="my-1 w-full">
          <Slot slot="content" parent={ref} />
        </div>
      </section>
    </>
  )
}

const Features: Component = () => {
  const [t] = useTransContext()

  return (
    <Card border>
      <section aria-labelledby="homeNotableFeats">
        <div id="homeNotableFeats" class="flex justify-center text-xl font-bold" aria-hidden="true">
          {t('notable_features')}
        </div>
        <div class="flex flex-col gap-2 leading-6">
          <p>
            <Trans key="notable_features_item_7">
              <b class="highlight">Agnaistic</b> is completely free to use. It is free to register.
              Your data will be kept private and you can permanently delete your data at any time.
              We take your privacy very seriously.
            </Trans>
          </p>
          <p>
            <Trans key="notable_features_item_6">
              <b class="highlight">Register</b> to have your data available on all of your devices.
            </Trans>
          </p>
          <p>{t('notable_features_item_5')}</p>
          <p>
            <Trans key="notable_features_item_4">
              Create <b class="highlight">Memory Books</b> to give your characters information about
              their world.
            </Trans>
          </p>
          <p>
            <Trans key="notable_features_item_3">
              <b class="highlight">Image generation</b> - Use Horde, NovelAI or your own Stable
              Diffusion server.
            </Trans>
          </p>
          <p>
            <Trans key="notable_features_item_2">
              <b class="highlight">Voice</b> - Give your characters a voice and speak back to them.
            </Trans>
          </p>
          <p>
            <Trans key="notable_features_item_1">
              <b class="highlight">Custom Presets</b> - Completely customise the Generation settings
              used to generate your responses.
            </Trans>
          </p>
        </div>
      </section>
    </Card>
  )
}

const HordeGuide: Component<{ close: () => void }> = (props) => {
  const [t] = useTransContext()

  return (
    <Modal show close={props.close} title="Horde Guide" maxWidth="half" ariaLabel="Horde guide">
      <div class="flex flex-col gap-2">
        <SolidCard bg="hl-900">
          <Trans key="ensure_you_have_registered_at_ai_horde">
            <b>Important!</b> For reliable responses, ensure you have registered at
            <a href="https://aihorde.net/register" class="link" target="_blank">
              AI Horde
            </a>
            . Once you have your key, add it to your
            <A href="/settings?tab=ai&service=horde" class="link">
              Horde Settings
            </A>
            .
          </Trans>
        </SolidCard>

        <SolidCard bg="hl-900">
          {t('ai_horde_is_run_and_powered_by_a_small_number_of_volunteers')}
        </SolidCard>

        <Card>
          <Trans key="keep_your_max_new_tokens_below_100">
            Keep your <b>Max New Tokens</b> below 100 unless you know what you're doing!
            <br />
            Using high values for 'Max New Tokens' is the main cause of timeouts and slow replies.
          </Trans>
        </Card>
        <Card>{t('by_default_we_use_anonymous_access')}</Card>
      </div>
    </Modal>
  )
}

const OpenAIGuide: Component<{ close: () => void }> = (props) => {
  return (
    <Modal show close={props.close} title="OpenAI Guide" maxWidth="half" ariaLabel="OpenAI guide">
      <div class="flex flex-col gap-2">
        <Card>
          <Trans key="open_ai_is_a_paid_service">
            OpenAI is a <b>paid service</b>. To use OpenAI, you to need provide your OpenAI API Key
            in your settings:
          </Trans>
        </Card>

        <Card>
          <Trans key="firstly_you_will_need_to_register_an_account_open_ai">
            Firstly, you will need to
            <A class="link" href="https://auth0.openai.com/u/signup" target="_blank">
              Register an account OpenAI
            </A>
            .
          </Trans>
        </Card>

        <Card>
          <Trans key="once_registered_you_will_need_to_get_open_ai_api_key">
            Once registered, you will need to
            <A class="link" href="https://platform.openai.com/account/api-keys" target="_blank">
              generate an API key
            </A>
            .
          </Trans>
        </Card>

        <Card>
          <Trans key="once_you_have_your_open_ai_api_key">
            Once you have your API key, head to the
            <A class="link" href="/settings?tab=ai&service=openai">
              Settings
            </A>
            page and set your key in the OpenAI area.
          </Trans>
        </Card>

        <Card>
          <Trans key="to_use_open_ai_to_generate_your_responses">
            To use OpenAI to generate your responses, ensure your chat is using OpenAI Preset in
            your <b>Chat Preset settings</b>.
            <br />
            You can access these via the top-right menu in your chat.
          </Trans>
        </Card>
      </div>
    </Modal>
  )
}
