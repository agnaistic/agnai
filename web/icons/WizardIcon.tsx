import { Component } from 'solid-js'
import AppIcon, { IconProps } from './AppIcon'
// import svg from 'jsx:../asset/WizardIcon.svg'
import svg from '../asset/WizardIcon.svg?raw'

const WizardIcon: Component<IconProps> = (props) => <AppIcon {...props} svg={svg} />

export default WizardIcon
