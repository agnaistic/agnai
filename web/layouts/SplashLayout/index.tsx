import { Component, createEffect, createMemo, JSX } from 'solid-js'
import { settingStore, userStore } from '../../store'
import NavBar from '../../shared/NavBar'
import Navigation from '../../Navigation'
import Toasts from '../../Toasts'
import {A} from "@solidjs/router";

const SplashLayout: Component<{ children: string | JSX.Element }> = (props) => {
  return (
    <div class="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-[var(--hl-900)] app flex flex-col justify-between">
      <div class="flex w-full grow flex-row overflow-y-hidden">
        <div class="w-full overflow-y-auto">
          <div class={`mx-auto h-full w-full max-w-5xl px-2 pt-2 sm:px-3 sm:pt-4`}>
            {props.children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SplashLayout
