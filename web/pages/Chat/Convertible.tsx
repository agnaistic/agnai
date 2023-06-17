import { Component, JSX, Switch } from 'solid-js'
import { X } from 'lucide-solid'
import { useBgStyle, usePane } from '../../shared/hooks'
import Modal from '../../shared/Modal'
import { getSettingColor, userStore } from '../../store'
import { Match } from 'solid-js'
import { Card } from '/web/shared/Card'
import { Show } from 'solid-js'
import PageHeader from '/web/shared/PageHeader'

/** Content that can be a side pane, a modal, or a regular page */
export type Convertible = {
  title: string
  paneAndPageTitle?: JSX.Element
  body: JSX.Element
  footer?: JSX.Element
  mode: ConvertibleMode
}

export type ConvertibleAsPaneOrPopup = Convertible & { mode: PaneOrPopupMode }

export type ConvertibleMode = PageMode | PaneOrPopupMode

type PageMode = { kind: 'page'; close?: undefined }

type PaneOrPopupMode = {
  kind: 'paneOrPopup'
  close: () => void
  bodyWrapper?: (body: JSX.Element) => JSX.Element
}

export const Convertible: Component<Convertible> = (props) => (
  <>
    <Show when={props.mode.kind === 'page'}>
      <ConvertibleAsPage {...props} />
    </Show>
    <Show when={props.mode.kind === 'paneOrPopup'}>
      <ConvertibleAsRightPaneOrModal {...(props as ConvertibleAsPaneOrPopup)} />
    </Show>
  </>
)

const ConvertibleAsPage: Component<Convertible> = (props) => {
  return (
    <div class="mr-2 flex flex-col gap-2">
      {props.paneAndPageTitle}
      {props.body}
      <Footer>{props.footer}</Footer>
    </div>
  )
}

const ConvertibleAsRightPaneOrModal: Component<ConvertibleAsPaneOrPopup> = (props) => {
  const user = userStore()
  const rightPaneBgStyles = useBgStyle({
    hex: getSettingColor(user.current.botBackground || 'bg-800'),
    blur: true,
  })
  const paneOrPopup = usePane()
  const body = props.mode.bodyWrapper?.(props.body) ?? props.body
  return (
    <Switch>
      <Match when={paneOrPopup() === 'pane'}>
        <div
          class="hidden w-full min-w-[448px] overflow-y-auto  py-3 xs:block"
          style={rightPaneBgStyles()}
        >
          <div onClick={props.mode.close} class="sticky top-0 z-20 float-right cursor-pointer">
            <div class="ml-[-32px]">
              <X />
            </div>
          </div>
          <div class="pl-2">{props.paneAndPageTitle ?? <PageHeader title={props.title} />}</div>
          <div class="px-2">{body}</div>
          <Footer>{props.footer}</Footer>
        </div>
      </Match>
      <Match when={paneOrPopup() === 'popup'}>
        <Modal show={true} close={props.mode.close} title={props.title} footer={props.footer}>
          {body}
        </Modal>
      </Match>
    </Switch>
  )
}

const Footer: Component<{ children: JSX.Element }> = (props) => (
  <div class={`sticky bottom-0 mt-4 mr-2 text-right`}>
    <Card class="inline-flex justify-end gap-2" bg="bg-900" bgOpacity={1}>
      {props.children}
    </Card>
  </div>
)
