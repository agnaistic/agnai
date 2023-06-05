import { Component, Show } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { adaptersToOptions, setComponentPageTitle } from '../../shared/util'
import { settingStore } from '../../store'
import { markdown } from '../../shared/markdown'
import { A } from '@solidjs/router'
import { AlertTriangle } from 'lucide-solid'

const text = `
<a href="/discord" target="_blank">Our Discord</a>

Agnaistic is a "bring your own AI" chat service. It is completely open-source and free to use. You only pay for the third-party AI services that you choose to use.
Your conversations are completely private and never shared with anyone unless you invite them to your chat.
Features:

- Chat with multiple users and characters
- Create dynamic "Memory Books" to save on context
- Generate images
- Use text-to-speech and speech-to-text
- Create your own custom presets (generation settings)
- Run Agnaistic locally (see the GitHub link at the bottom of the page)

## Important Things to Know

Agnaistic is a "bring your own AI" chat service.

- For the best experience, sign up for a service like OpenAI, NovelAI, GooseAI, or provide your own service using Kobold or Textgen-WebUI.
- Head to the Settings page to configure your API Key
- **Horde**: It is recommended to register at <a href="https://aihorde.net/register" target="_blank">AIHorde.net/register</a> to prevent your messages from failing.

# Registration

You don't need to register to use Agnaistic. You can use it anonymously and no data will be stored on any servers.
If you choose to register, your data will be stored and accessible on any devices you login with.

## Quick Start

If you have an account with an AI service (OpenAI, NovelAI, GooseAI, etc) then go add your key in the Settings page!
Be sure to select a preset that uses your preferred AI service.

A character has been created for you! You can head to the [Characters](/character/list) page, choose a character and create a conversation to get started!
You can edit the character from the Characters page or from the Chat. This may be helpful to see an example of how to author your own character.

- **Characters**: This is where you create, edit, and delete your characters.
- **Chats** page: This is where your conversations reside.
- **Settings**: You can modify the UI, AI, and Image Generation settings from the settings page.
- **Presets**: For more advanced users, you can modify your generation settings (temperature, penalties, prompt settings) here.

## AI Horde

This can sometimes be a little slow. AI Horde is run and powered by a small number of volunteers that provide their GPUs.

*Keep your 'Max New Tokens' below 100 unless you know what you're doing!*
*Using high values for 'Max New Tokens' is the main cause of timeouts and slow replies.*

By default we use anonymous access and the <b>Pygmalion 6B</b> model. You can provide your API key or change the model in the Settings page.

## Kobold

If you're self-hosting KoboldAI or using Colab, you can use the LocalTunnel URL in the **Kobold URL** field in the Settings page.

## NovelAI

You can provide your API key and choose between Euterpe and Krake in the settings page. Visit the [instructions page](https://github.com/agnaistic/agnai/blob/dev/instructions/novel.md) to learn how to retrieve your API key.

`

const HomePage: Component = () => {
  setComponentPageTitle('Information')
  const cfg = settingStore((cfg) => ({
    adapters: adaptersToOptions(cfg.config.adapters),
    guest: cfg.guestAccessAllowed,
    config: cfg.config,
  }))
  return (
    <div>
      <PageHeader
        title={
          <>
            Welcome to Agn<span class="text-[var(--hl-500)]">ai</span>stic
          </>
        }
      />

      <Show when={!cfg.guest}>
        <div class="flex text-orange-500">
          <AlertTriangle class="mr-2 mb-2" />
          Your browser does not support local storage. You will need to login/register to use
          Agnaistic.
        </div>
      </Show>

      <div class="markdown" innerHTML={markdown.makeHtml(text)} />

      <div class="markdown">
        <b>Useful Links</b>

        <ul>
          <li>
            <A href="/changelog">Change Log</A>
          </li>
          <li>
            <A
              href="https://github.com/agnaistic/agnai/blob/dev/instructions/memory.md"
              target="_blank"
            >
              Memory Book Guide
            </A>
          </li>
          <li>
            <A href="https://github.com/agnaistic/agnai" target="_blank">
              Github Repository
            </A>
          </li>
          <Show when={cfg.config.policies}>
            <li>
              <A class="link" href="/terms-of-service">
                Terms of Service
              </A>{' '}
              and{' '}
              <A class="link" href="/privacy-policy">
                Privacy Policy
              </A>
              .
            </li>
          </Show>
        </ul>
      </div>
    </div>
  )
}

export default HomePage
