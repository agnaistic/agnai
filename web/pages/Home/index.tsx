import './home.scss'
import { Component, For, Match, Show, Switch, createSignal, onMount } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
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

const enum Sub {
  None,
  OpenAI,
  NovelAI,
  Horde,
}

const HomePage: Component = () => {
  setComponentPageTitle('Information')
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
      <PageHeader title="" />

      <Show when={!cfg.guest}>
        <div class="flex text-orange-500">
          <AlertTriangle class="mb-2 mr-2" />
          Your browser does not support local storage. You will need to login/register to use
          Agnaistic.
        </div>
      </Show>

      <div class="flex flex-col gap-4 text-lg">
        <div class="hidden justify-center text-6xl sm:flex">
          Agn<span class="text-[var(--hl-500)]">ai</span>stic
        </div>

        <Show when={cfg.config.patreon}>
          <TitleCard type="hl" class="flex w-full items-center">
            Agnaistic now hosts its own models! Use them for free by using the{' '}
            <span class="font-bold">&nbsp;Agnaistic&nbsp;</span> service in your presets
          </TitleCard>
        </Show>

        <RecentChats />

        <Show when={announce.list.length > 0}>
          <Announcements list={announce.list} />
        </Show>

        <div class="home-cards">
          <TitleCard type="bg" title="Guides" class="" center>
            <div class="flex flex-wrap justify-center gap-2">
              <A href="/guides/pipeline">
                <Pill inverse>Pipeline Guide</Pill>
              </A>
              <a>
                <Pill inverse onClick={() => setSub(Sub.OpenAI)}>
                  OpenAI
                </Pill>
              </a>
              <A href="/guides/novel">
                <Pill inverse>NovelAI</Pill>
              </A>
              <a>
                <Pill inverse onClick={() => setSub(Sub.Horde)}>
                  Horde
                </Pill>
              </a>
              <A href="/guides/memory">
                <Pill inverse>Memory Book</Pill>
              </A>
            </div>
          </TitleCard>

          <TitleCard type="bg" title="Links" center>
            <div class="flex flex-wrap justify-center gap-2">
              <a href="/discord" target="_blank">
                <Pill inverse>Agnaistic Discord</Pill>
              </a>

              <A href="https://github.com/agnaistic/agnai" target="_blank">
                <Pill inverse>GitHub</Pill>
              </A>
            </div>
          </TitleCard>
        </div>

        <Show when={announce.list.length === 0}>
          <Features />
        </Show>

        <Card border>
          <div class="mb-2 flex justify-center text-xl font-bold">Getting Started</div>
          <div class="flex flex-col items-center gap-2 leading-6">
            <p>
              First time here? Head to the{' '}
              <A class="link" href="/chats">
                Chats Page
              </A>{' '}
              and try chatting to AI characters for free using{' '}
              {location.host.toLowerCase().includes('agnai.chat') ? 'our own models or' : ''}{' '}
              <a class="link" href="https://aihorde.net" target="_blank">
                Horde
              </a>
              !
            </p>
            <p>
              Already have OpenAI, NovelAI, GooseAI, Scale, Claude? Head to the{' '}
              <A class="link" href="/settings?tab=ai">
                Settings Page
              </A>{' '}
              and configure your AI service.
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
    <div class="flex flex-col">
      <div class="text-lg font-bold">Recent Conversations</div>
      <div
        class="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
        classList={{ hidden: state.last.length === 0 }}
      >
        <For each={state.last}>
          {({ chat, char }) => (
            <>
              <div
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

                <div class="flex w-full flex-col justify-between text-sm">
                  <div class="flex flex-col px-1">
                    <div class="text-sm font-bold">{char.name}</div>
                    <div class="text-500 text-xs">{elapsedSince(chat.updatedAt)} ago</div>
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
                class="bg-800 hover:bg-700 flex w-full cursor-pointer flex-col rounded-md border-[1px] border-[var(--bg-700)] transition duration-300 sm:hidden"
                onClick={() => nav(`/chat/${chat._id}`)}
              >
                <div class="flex">
                  <div class="flex items-center justify-center px-1 pt-1">
                    <AvatarIcon
                      noBorder
                      format={{ corners: 'circle', size: 'md' }}
                      avatarUrl={getAssetUrl(char?.avatar || '')}
                    />
                  </div>
                  <div class="flex flex-col overflow-hidden text-ellipsis whitespace-nowrap px-1">
                    <div class="overflow-hidden text-ellipsis text-sm font-bold">{char.name}</div>
                    <div class="text-500 text-xs">{elapsedSince(chat.updatedAt)} ago</div>
                  </div>
                </div>

                <div class="flex h-full w-full flex-col justify-between text-sm">
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
          <BorderCard href="/chats/create">
            <div>Start Conversation</div>
            <Plus size={20} />
          </BorderCard>
        </Show>

        <Show when={state.last.length < 3}>
          <BorderCard href="/editor">
            <div>Create a Character</div>
            <WizardIcon size={20} />
          </BorderCard>
        </Show>

        <Show when={state.last.length < 2}>
          <BorderCard href="/settings">
            <div class="flex w-full items-center justify-center text-center">
              Configure your AI Services
            </div>
            <Settings size={20} />
          </BorderCard>
        </Show>
      </div>
    </div>
  )
}

const BorderCard: Component<{ children: any; href: string }> = (props) => {
  const nav = useNavigate()
  return (
    <div
      class="bg-800 text-700 hover:bg-600 flex h-24 w-full cursor-pointer flex-col items-center justify-center border-[2px] border-dashed border-[var(--bg-700)] text-center transition duration-300"
      onClick={() => nav(props.href)}
    >
      {props.children}
    </div>
  )
}

const Announcements: Component<{ list: AppSchema.Announcement[] }> = (props) => {
  return (
    <div>
      <div class="font-bold">Latest News</div>
      <For each={props.list}>
        {(item) => (
          <div class="rounded-md border-[1px] border-[var(--hl-500)]">
            <div class="flex flex-col rounded-t-md bg-[var(--hl-800)] p-2">
              <div class="text-lg font-bold">{item.title}</div>
              <div class="text-700 text-xs">{elapsedSince(item.showAt)} ago</div>
            </div>
            <div
              class="rendered-markdown bg-900 rounded-b-md p-2"
              innerHTML={markdown.makeHtml(item.content)}
            ></div>
          </div>
        )}
      </For>
    </div>
  )
}

const Features: Component = () => (
  <Card border>
    <div class="flex justify-center text-xl font-bold">Notable Features</div>
    <div class="flex flex-col gap-2 leading-6">
      <p>
        <b class="highlight">Agnaistic</b> is completely free to use. It is free to register. Your
        data will be kept private and you can permanently delete your data at any time. We take your
        privacy very seriously.
      </p>
      <p>
        <b class="highlight">Register</b> to have your data available on all of your devices.
      </p>
      <p>Chat with multiple users and multiple characters at the same time</p>
      <p>
        Create <b class="highlight">Memory Books</b> to give your characters information about their
        world.
      </p>
      <p>
        <b class="highlight">Image generation</b> - Use Horde, NovelAI or your own Stable Diffusion
        server.
      </p>
      <p>
        <b class="highlight">Voice</b> - Give your characters a voice and speak back to them.
      </p>
      <p>
        <b class="highlight">Custom Presets</b> - Completely customise the Generation settings used
        to generate your responses.
      </p>
    </div>
  </Card>
)

const HordeGuide: Component<{ close: () => void }> = (props) => (
  <Modal show close={props.close} title="Horde Guide" maxWidth="half">
    <div class="flex flex-col gap-2">
      <SolidCard bg="hl-900">
        <b>Important!</b> For reliable responses, ensure you have registered at{' '}
        <a href="https://aihorde.net/register" class="link" target="_blank">
          AI Horde
        </a>
        . Once you have your key, add it to your{' '}
        <A href="/settings?tab=ai&service=horde" class="link">
          Horde Settings
        </A>
        .
      </SolidCard>

      <SolidCard bg="hl-900">
        AI Horde is run and powered by a small number of volunteers that provide their GPUs. This is
        a great service, but it can be a little slow. Consider contributing to the Horde!
      </SolidCard>

      <Card>
        Keep your <b>Max New Tokens</b> below 100 unless you know what you're doing!
        <br />
        Using high values for 'Max New Tokens' is the main cause of timeouts and slow replies.
      </Card>
      <Card>
        By default we use anonymous access. You can provide your API key or change the model in the
        Settings page.
      </Card>
    </div>
  </Modal>
)

const OpenAIGuide: Component<{ close: () => void }> = (props) => (
  <Modal show close={props.close} title="OpenAI Guide" maxWidth="half">
    <div class="flex flex-col gap-2">
      <Card>
        OpenAI is a <b>paid service</b>. To use OpenAI, you to need provide your OpenAI API Key in
        your settings:
      </Card>

      <Card>
        Firstly, you will need to{' '}
        <A class="link" href="https://auth0.openai.com/u/signup" target="_blank">
          Register an account OpenAI
        </A>
        .
      </Card>

      <Card>
        Once registered, you will need to{' '}
        <A class="link" href="https://platform.openai.com/account/api-keys" target="_blank">
          generate an API key.
        </A>
      </Card>

      <Card>
        Once you have your API key, head to the{' '}
        <A class="link" href="/settings?tab=ai&service=openai">
          Settings
        </A>{' '}
        page and set your key in the OpenAI area.
      </Card>

      <Card>
        To use OpenAI to generate your responses, ensure your chat is using OpenAI Preset in your{' '}
        <b>Chat Preset settings</b>.
        <br />
        You can access these via the top-right menu in your chat.
      </Card>
    </div>
  </Modal>
)
