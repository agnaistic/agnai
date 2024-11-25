import './convertible.scss'
import { Component, JSX, Switch } from 'solid-js'
import { X } from 'lucide-solid'
import { useBgStyle, usePane } from '../hooks'
import Modal from '../Modal'
import { Match } from 'solid-js'
import { Card } from '/web/shared/Card'

/** Content that can be a side pane, a modal, or a regular page */
export type ConvertibleProps = {
  title?: string | JSX.Element
  children: JSX.Element
  footer?: JSX.Element
  close: () => void
  wrapper?: (body: JSX.Element) => JSX.Element
}

export const Convertible: Component<ConvertibleProps> = (props) => {
  const rightPaneBgStyles = useBgStyle({
    hex: 'bg-800',
    blur: true,
  })
  const paneOrPopup = usePane()
  const body = props.wrapper?.(props.children) ?? props.children

  return (
    <Switch>
      <Match when={paneOrPopup() === 'pane'}>
        <div data-pane class="convertible-pane w-full overflow-y-auto" style={rightPaneBgStyles()}>
          <div style={{ 'grid-area': 'title' }} class="flex justify-between py-2 pl-2">
            <div>{props.title}</div>
            <div class="sticky top-0 float-right" onClick={props.close}>
              <div class="ml-[-32px] cursor-pointer">
                <X />
              </div>
            </div>
          </div>
          <div style={{ 'grid-area': 'content' }} class="overflow-x-none overflow-y-auto px-2">
            {body}
          </div>
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
  <div style={{ 'grid-area': 'footer' }} class={`flex justify-end`}>
    <Card class="inline-flex justify-end gap-2" bg="bg-900" bgOpacity={1}>
      {props.children}
    </Card>
  </div>
)

export default Convertible
