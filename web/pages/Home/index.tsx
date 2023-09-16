import './home.scss'
import { Component, Match, Show, Switch, createSignal } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { adaptersToOptions, setComponentPageTitle } from '../../shared/util'
import { settingStore } from '../../store'
import { A } from '@solidjs/router'
import { AlertTriangle } from 'lucide-solid'
import { Card, Pill, SolidCard, TitleCard } from '/web/shared/Card'
import Modal from '/web/shared/Modal'

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
            <span class="font-bold">&nbsp;Agnaistic&nbsp;</span> service in your presets!
          </TitleCard>
        </Show>

        <Card border>
          <div class="leading-6">
            <b>Agnaistic</b> is a "bring your own AI" chat service. It is completely open-source and
            free to use. You only pay for the third-party AI services that you choose to use. Your
            conversations are completely private and are never shared with anyone unless you invite
            them to your chat.
          </div>
        </Card>

        <div class="home-cards">
          <TitleCard type="bg" title="Guides" class="" center>
            <div class="flex flex-wrap justify-center gap-2">
              <A href="/guides/pipeline">
                <Pill inverse type="hl">
                  Pipeline Guide
                </Pill>
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
                <Pill inverse>Discord</Pill>
              </a>

              <A class="link" href="/changelog">
                <Pill inverse>Change Log</Pill>
              </A>

              <A href="https://github.com/agnaistic/agnai" target="_blank">
                <Pill inverse>GitHub</Pill>
              </A>

              <A class="link" href="/terms-of-service">
                <Pill inverse>Terms of Service</Pill>
              </A>

              <A class="link" href="/privacy-policy">
                <Pill inverse>Privacy Policy</Pill>
              </A>
            </div>
          </TitleCard>
        </div>

        <Card border>
          <div class="flex justify-center text-xl font-bold">Notable Features</div>
          <div class="flex flex-col gap-2 leading-6">
            <p>
              <b class="highlight">Agnaistic</b> is completely free to use. It is free to register.
              Your data will be kept private and you can permanently delete your data at any time.
              We take your privacy very seriously.
            </p>
            <p>
              <b class="highlight">Register</b> to have your data available on all of your devices.
            </p>
            <p>Chat with multiple users and multiple characters at the same time</p>
            <p>
              Create <b class="highlight">Memory Books</b> to give your characters information about
              their world.
            </p>
            <p>
              <b class="highlight">Image generation</b> - Use Horde, NovelAI or your own Stable
              Diffusion server.
            </p>
            <p>
              <b class="highlight">Voice</b> - Give your characters a voice and speak back to them.
            </p>
            <p>
              <b class="highlight">Custom Presets</b> - Completely customise the Generation settings
              used to generate your responses.
            </p>
          </div>
        </Card>

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
