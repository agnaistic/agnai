import { A } from '@solidjs/router'
import { Component } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { adaptersToOptions } from '../../shared/util'
import { settingStore } from '../../store'
import { markdown } from '../../shared/markdown'

const homeText = `
**Useful Links**:

- [Github Repository](https://github.com/luminai-companion/agn-ai)
- [Feature Roadmap](https://github.com/users/sceuick/projects/1/views/1)
- [Memory Book Guide](https://github.com/luminai-companion/agn-ai/blob/dev/instructions/memory.md)

Agnaistic is in a fairly early stage of development. Bugs and some rough edges are expected. If you encounter an issue or have an idea you'd like to share you can head over to the [GitHub repository](https://github.com/luminai-companion/agn-ai) and create an issue.

# Registration

You don't need to register to use Agnaistic. You can use it anonymously and no data will be stored on any servers.
If you choose to register, your data will be stored and accessible on any devices you login with.

# Getting Started

### Recommendations

- For the best speed and quality, use a service like OpenAI, NovelAI, or Claude.
- If you're looking for a free option, consider running your own model using Kobold or accumulating kudos on AI Horde.
- If you want to run Agnaistic locally, visit the Github Repository for the various methods of installation.

## Quick Start

A character has been created for you! You can head to the [Characters](/character/list) page, choose a character and create a conversation to get started!
You can edit the character from the Characters page or from the Chat. This may be helpful to see an example of how to author your own character.

- **Characters**: This is where you create, edit, and delete your characters.
- **Chats** page: This is where your conversations reside.
- **Settings**: You can modify the UI, AI, and Image Generation settings from the settings page.
- **Presets**: For more advanced users, you can modify your generation settings (temperature, penalties, prompt settings) here.

## AI Horde

This can sometimes be slow. AI Horde is run and powered by a small number of volunteers that provide their GPUs.

*Keep your 'Max New Tokens' below 100 unless you know what you're doing!*
*Using high values for 'Max New Tokens' is the main cause of timeouts and slow replies.*

By default we use anonymous access and the <b>Pygmalion 6B</b> model. You can provide your API key or change the model in the Settings page.

## Kobold

If you're self-hosting KoboldAI or using Colab, you can use the LocalTunnel URL in the **Kobold URL** field in the Settings page.

## NovelAI

You can provide your API key and choose between Euterpe and Krake in the settings page. Visit the [instructions page](https://github.com/luminai-companion/agn-ai/blob/dev/instructions/novel.md) to learn how to retrieve your API key.
`

const HomePage: Component = () => {
  const cfg = settingStore((cfg) => ({ adapters: adaptersToOptions(cfg.config.adapters) }))
  return (
    <div>
      <PageHeader
        title={
          <>
            Welcome to Agn<span class="text-[var(--hl-500)]">ai</span>stic
          </>
        }
        subtitle={`Available services: ${cfg.adapters.map((adp) => adp.label).join(', ')}`}
      />

      <div class="markdown" innerHTML={markdown.makeHtml(homeText)} />
    </div>
  )
}

export default HomePage
