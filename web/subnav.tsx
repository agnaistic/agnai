import { JSX } from "solid-js"
import { createStore } from "./store/create"

type NavState = {
  header: JSX.Element | null
  body: JSX.Element | null
  footer: JSX.Element | null

  state: 'main' | 'sub' | 'closed'
}

const initial: NavState = {
  header: null,
  body: null,
  footer: null,

  state: 'main'
}


export const navStore = createStore('nav', initial)((get, set) => {

  return {

  }
})

const useSubNav() {
  
}