import { Component } from 'solid-js'
import { ImageContext } from './image-context'
import { ImagePresetSettings, ImageProviderSettings } from 'common/types/image-schema'

type ImagePreset = {
  _id: string
  providerId: string

  provider: { [id: string]: ImageProviderSettings }
  samplers: Omit<ImagePresetSettings, '_id' | 'name'>
}

export const ImagePreset: Component<{ ctx: ImageContext }> = (props) => {
  return null
}
