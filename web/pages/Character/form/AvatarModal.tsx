import { Component } from 'solid-js'
import { RootModal } from '/web/shared/Modal'
import { getAssetUrl } from '/web/shared/util'

export const AvatarModal: Component<{ url?: string; close: () => void }> = (props) => {
  return (
    <RootModal show={!!props.url} close={props.close} maxWidth="half" fixedHeight>
      <div class="flex justify-center p-4">
        <img class="rounded-md" src={getAssetUrl(props.url!)} />
      </div>
    </RootModal>
  )
}
