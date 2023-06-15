import { Component, JSX, Switch } from 'solid-js'
import { X } from 'lucide-solid'
import { useBgStyle, usePane } from '../../shared/hooks'
import Modal from '../../shared/Modal'
import { getSettingColor, userStore } from '../../store'
import { Match } from 'solid-js'

export const RightPane: Component<{
  close: () => void
  children: JSX.Element
  modalTitle: string
}> = (props) => {
  const user = userStore()
  const rightPaneBgStyles = useBgStyle({
    hex: getSettingColor(user.current.botBackground || 'bg-800'),
    blur: true,
  })
  const paneOrPopup = usePane()
  const content = props.children
  return (
    <Switch>
      <Match when={paneOrPopup() === 'pane'}>
        <div class="hidden py-3 xs:block" style={rightPaneBgStyles()}>
          <div onClick={props.close} class="sticky top-0 z-20 float-right cursor-pointer">
            <div class="ml-[-32px]">
              <X />
            </div>
          </div>
          <div class=" overflow-y-scroll px-2">{content}</div>
        </div>
      </Match>
      <Match when={paneOrPopup() === 'popup'}>
        <Modal show={true} close={props.close} title={props.modalTitle}>
          {content}
        </Modal>
      </Match>
    </Switch>
  )
}
