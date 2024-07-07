import { Component, onMount } from 'solid-js'
import { useNavigate } from '@solidjs/router'

const RedirectToHomepage: Component = (props) => {
  const nav = useNavigate()

  onMount(() => {
    return nav('/')
  })

  return <div>WTF IS HAPPENING</div>
}

export default RedirectToHomepage
