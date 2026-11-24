import { Component } from 'solid-js'
import AppIcon, { IconProps } from './AppIcon'
import svgLight from '../asset/DiscordLight.svg?raw'
import svgDark from '../asset/DiscordDark.svg?raw'

export const DiscordLightIcon: Component<IconProps> = (props) => (
  <AppIcon {...props} svg={svgLight} />
)

export const DiscordDarkIcon: Component<IconProps> = (props) => <AppIcon {...props} svg={svgDark} />
