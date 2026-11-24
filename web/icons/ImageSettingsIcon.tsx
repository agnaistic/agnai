import { Component } from 'solid-js'
import AppIcon, { IconProps } from './AppIcon'
import svg from '../asset/ImageSettingsIcon.svg?raw'

const ImageSettingsIcon: Component<IconProps> = (props) => <AppIcon {...props} svg={svg} />

export default ImageSettingsIcon
