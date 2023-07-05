import { Component } from 'solid-js'
import AppIcon, { IconProps } from './AppIcon'
import svg from 'bundle-text:../asset/NoCharacter.svg'

const NoCharacterIcon: Component<IconProps> = (props) => <AppIcon {...props} svg={svg} />

export default NoCharacterIcon
