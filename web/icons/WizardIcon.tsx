import { Component } from 'solid-js'
import AppIcon, { IconProps } from './AppIcon'
import svg from 'bundle-text:../assets/WizardIcon.svg'

const WizardIcon: Component<IconProps> = (props) => <AppIcon {...props} svg={svg} />

export default WizardIcon
