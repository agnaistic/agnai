import { Component } from 'solid-js'
import AppIcon, { IconProps } from './AppIcon'
import svgLight from 'bundle-text:../asset/DiscordLight.svg'
import svgDark from 'bundle-text:../asset/DiscordDark.svg'

export const DiscordLightIcon: Component<IconProps> = (props) => (
  <AppIcon {...props} svg={svgLight} />
)

export const DiscordDarkIcon: Component<IconProps> = (props) => <AppIcon {...props} svg={svgDark} />
