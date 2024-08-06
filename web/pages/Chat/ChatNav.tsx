import { Component } from 'solid-js'
import { ContextState } from '/web/store/context'
import { CharacterAvatar } from '/web/shared/AvatarIcon'
import { Nav } from '/web/Navigation'

type NavProps = {
  ctx: ContextState
}

const Header: Component<NavProps> = (props) => {
  return (
    <Nav.Item>
      <CharacterAvatar char={props.ctx.char!} format={{ corners: 'circle', size: 'md' }} />
      <div>{props.ctx.char?.name}</div>
    </Nav.Item>
  )
}

const Body: Component<NavProps> = (props) => {
  return null
}

const Footer: Component<NavProps> = (props) => {
  return null
}
