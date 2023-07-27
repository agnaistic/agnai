import { Component, JSX, Show, Switch } from 'solid-js'
import { X } from 'lucide-solid'
import { useBgStyle, usePane } from '../../shared/hooks'
import Modal from '../../shared/Modal'
import { Match } from 'solid-js'
import { Card } from '/web/shared/Card'
import PageHeader from '/web/shared/PageHeader'

/** Content that can be a side pane, a modal, or a regular page */

type PageProps = {
  title?: string
  paneAndPageTitle?: JSX.Element
  children: JSX.Element
  footer?: JSX.Element
  kind: 'page'
  wrapper?: (body: JSX.Element) => JSX.Element
}

type PartialProps = {
  title?: string | JSX.Element
  children: JSX.Element
  footer?: JSX.Element
  kind: 'partial'
  close: () => void
  wrapper?: (body: JSX.Element) => JSX.Element
}

export type ConvertibleProps = PageProps | PartialProps

const Convertible: Component<ConvertibleProps> = (props) => (
  <Switch>
    <Match when={props.kind === 'page'}>
      <div class="mr-2 flex flex-col gap-2">
        <Show when={props.title}>{props.title}</Show>
        {props.children}
        <Footer>{props.footer}</Footer>
      </div>
    </Match>

    <Match when={true}>
      <WithinPage {...(props as PartialProps)} />
    </Match>
  </Switch>
)

const WithinPage: Component<PartialProps> = (props) => {
  const rightPaneBgStyles = useBgStyle({
    hex: 'bg-800',
    blur: true,
  })
  const paneOrPopup = usePane()
  const body = props.wrapper?.(props.children) ?? props.children
  return (
    <Switch>
      <Match when={paneOrPopup() === 'pane'}>
        <div
          data-pane
          class="hidden w-full min-w-[448px] max-w-[650px] overflow-y-auto py-3 xs:block"
          style={rightPaneBgStyles()}
        >
          <div onClick={props.close} class="sticky top-0 float-right cursor-pointer">
            <div class="ml-[-32px]">
              <X />
            </div>
          </div>
          <div class="pl-2">{props.title ?? <PageHeader title={props.title} />}</div>
          <div class="px-2">{body}</div>
          <Footer>{props.footer}</Footer>
        </div>
      </Match>
      <Match when={paneOrPopup() === 'popup'}>
        <Modal show={true} close={props.close!} title={props.title} footer={props.footer}>
          {body}
        </Modal>
      </Match>
    </Switch>
  )
}

const Footer: Component<{ children: JSX.Element }> = (props) => (
  <div class={`sticky bottom-0 mr-2 mt-4 text-right`}>
    <Card class="inline-flex justify-end gap-2" bg="bg-900" bgOpacity={1}>
      {props.children}
    </Card>
  </div>
)

export default Convertible
