import { Component } from 'solid-js'
import { Portal } from 'solid-js/web'

export const PageHeader: Component<{ children: any }> = (props) => {
  return <Portal mount={document.getElementById('site-header')!}>{props.children}</Portal>
}
