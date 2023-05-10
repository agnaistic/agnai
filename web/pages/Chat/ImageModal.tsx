import { Component } from 'solid-js'
import { NoTitleModal } from '../../shared/Modal'
import { settingStore } from '../../store'
import { getAssetUrl } from '../../shared/util'

export const ImageModal: Component = () => {
  const state = settingStore()

  return (
    <NoTitleModal show={!!state.showImage} close={() => settingStore.showImage()} maxWidth="half">
      <div class="flex justify-center p-4">
        <img class="rounded-md" src={getAssetUrl(state.showImage!)} />
      </div>
    </NoTitleModal>
  )
}
