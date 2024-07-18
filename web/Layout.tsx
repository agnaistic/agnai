import { Component } from 'solid-js'
import { Portal } from 'solid-js/web'

export const HeaderPortal: Component<{ children: any }> = (props) => {
  return <Portal mount={document.getElementById('site-header')!}>{props.children}</Portal>
}

export const Page: Component<{ children: any; class?: string }> = (props) => {
  return <main class={`h-full w-full px-2 sm:px-3 ${props.class || ''}`}>{props.children}</main>
}
