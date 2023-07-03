import { Component, Show, createMemo, createSignal } from 'solid-js'
import { userStore } from '/web/store'
import Button from '/web/shared/Button'
import { SolidCard } from '/web/shared/Card'

const OpenRouterOauth: Component = () => {
  const users = userStore()

  const isKeySet = createMemo(() => !!users.user?.adapterConfig?.openrouter?.apiKeySet)
  const [_, setCode] = createSignal<string>()

  const handleCode = async (code: string) => {
    const res = await fetch(`https://openrouter.ai/api/v1/auth/keys`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }).then((res) => res.json())

    userStore.updateService('openrouter', { apiKey: res.key })
  }

  const start = () => {
    const url = location.origin
    const child = window.open(
      `https://openrouter.ai/auth?callback_url=${url}`,
      '_blank',
      'width=600,height=800,scrollbar=yes,top=100,left=100'
    )!

    const interval = setInterval(() => {
      try {
        const query = child.location.search
        const [, code] = query.split('=')
        if (!code) return

        handleCode(code)
        setCode(code)
        child.close()

        if (child.closed) {
          clearInterval(interval)
        }
      } catch (ex) {}
    }, 500)
  }

  return (
    <>
      <SolidCard>
        Head to{' '}
        <a class="link" target="_blank" href="https://openrouter.ai">
          OpenRouter.ai
        </a>{' '}
        to register.
        <br />
        Support for OpenRouter is quite new. Please provide feedback via Discord if you have any
        issues or questions.
      </SolidCard>
      <div>
        <Show when={isKeySet()}>
          <em>Key already set</em>
        </Show>
        <span></span>
        <Button onClick={start}>Login with OpenRouter</Button>
      </div>
    </>
  )
}

export default OpenRouterOauth
