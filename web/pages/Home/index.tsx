import { A } from '@solidjs/router'
import { Component } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { adaptersToOptions } from '../../shared/util'
import { settingStore } from '../../store'

const HomePage: Component = () => {
  const cfg = settingStore((cfg) => ({ adapters: adaptersToOptions(cfg.config.adapters) }))
  return (
    <div>
      <PageHeader
        title={
          <>
            Welcome to Agn<span class="text-purple-500">AI</span>stic
          </>
        }
      />
      <div class="flex flex-col gap-4">
        <div>
          This is currently in a fairly early stage of development. Bugs and some rough edges are
          expected, but are encouraged to be reported. If you encounter an issue you can head over
          to the{' '}
          <a href="https://github.com/sceuick/agn-ai/issues" target="_blank" class="link">
            GitHub repository
          </a>{' '}
          and create an issue.
        </div>
        <div class="text-2xl font-bold">Getting Started</div>
        <div class="lg">
          <p>
            Head over to the{' '}
            <A href="/settings" class="link">
              settings
            </A>{' '}
            page and choose your AI service. It is configured to use{' '}
            <a href="https://aihorde.net" target="_blank">
              Pygmalion 6B on AI Horde
            </a>{' '}
            by default.
          </p>
          <p>
            <span class="font-bold">Available services:</span>{' '}
            {cfg.adapters.map((a) => a.label).join(', ')}
          </p>
        </div>
        <div class="text-lg font-bold"> Using Kobold AI</div>
        <div>
          If you're self-hosting KoboldAI or using Colab, you can use the LocalTunnel URL in the{' '}
          <b>Kobold URL</b> field in the Settings page.
        </div>
        <div class="text-lg font-bold"> Using AI Horde</div>
        <div>
          By default we use anonymous access. and the <b>Pygmalion 6B</b> model. You can provide
          your API key or change the model in the Settings page.
        </div>
        <div class="text-lg font-bold"> Using Novel AI</div>
        <div>
          You can provide your API key and choose between Euterpe and Krake in the settings page.
          Visit the{' '}
          <a
            href="https://github.com/sceuick/agn-ai/blob/dev/instructions/novel.md"
            target="_blank"
            class="link"
          >
            instructions page
          </a>{' '}
          to learn how to retrieve your API key.
        </div>
        <div class="text-2xl font-bold">Create a Character</div>
        <div>
          Once you've chosen your AI service you can head to the{' '}
          <A class="link" href="/character/create">
            Character Creation
          </A>{' '}
          page to create a character to start chatting!
        </div>
        <div class="text-lg">
          <p>If you have feature suggestions or have an issue please let me know on GitHub!</p>
        </div>
        <div class="text-xl">Enjoy!</div>
      </div>
    </div>
  )
}
export default HomePage
