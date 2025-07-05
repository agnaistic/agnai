import { Component, Match, Show, Switch, createSignal } from 'solid-js'
import Button from '/web/shared/Button'
import { TitleCard } from '/web/shared/Card'

const OpenRouterOauth: Component<{
  onKey: (key: string) => void
  deleteKey: () => void
  keySet: boolean
}> = (props) => {
  const [trying, setTrying] = createSignal(false)

  const handleCode = async (code: string) => {
    setTrying(true)
    const res = await fetch(`https://openrouter.ai/api/v1/auth/keys`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }).then((res) => res.json())

    props.onKey(res.key)
    setTrying(false)
  }

  const start = () => {
    setTrying(true)
    const url = location.origin
    const child = window.open(
      `https://openrouter.ai/auth?callback_url=${url}`,
      '_blank',
      'width=600,height=800,scrollbar=yes,top=100,left=100'
    )!

    const interval = setInterval(() => {
      try {
        if (child.closed) {
          setTrying(false)
          clearInterval(interval)
        }

        const query = child.location.search
        const [, code] = query.split('=')
        if (!code) return

        handleCode(code)
        child.close()
        clearInterval(interval)
      } catch (ex) {}
    }, 500)
  }

  return (
    <>
      <Show when={!props.keySet}>
        <TitleCard>
          Click <b class="highlight">Login with OpenRouter</b> or visit{' '}
          <a class="link" target="_blank" href="https://openrouter.ai/keys">
            OpenRouter.ai/keys
          </a>{' '}
          to create an API key and enter it above.
        </TitleCard>
      </Show>

      <div>
        <Switch>
          <Match when={trying()}>
            <Button disabled>Logging in...</Button>
          </Match>
          <Match when={!props.keySet}>
            <Button onClick={start}>Login with OpenRouter</Button>
          </Match>

          <Match when={props.keySet}>
            <Button onClick={props.deleteKey}>Logout</Button>
          </Match>
        </Switch>
      </div>
    </>
  )
}

export default OpenRouterOauth
