import { useNavigate } from '@solidjs/router'
import { Component } from 'solid-js'

const Redirect: Component<{ internal?: string; external?: string }> = (props) => {
  const nav = useNavigate()

  if (props.external) {
    window.location.href = props.external
  }

  nav(props.internal || '/')

  return <>Redirecting...</>
}

export default Redirect
