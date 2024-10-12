import { Component, createMemo } from 'solid-js'
import { Portal } from 'solid-js/web'

export const HeaderPortal: Component<{ children: any }> = (props) => {
  return <Portal mount={document.getElementById('site-header')!}>{props.children}</Portal>
}

export const Page: Component<{ children: any; class?: string; classList?: any }> = (props) => {
  const hasHorzPaddingClass = createMemo(() => {
    if (isHorzPadding(props.class)) return true

    for (const [cls, value] of Object.entries(props.classList || {})) {
      if (!isHorzPadding(cls)) continue
      if (value) return true
    }

    return false
  })

  return (
    <main
      class={`h-full w-full ${props.class || ''}`}
      classList={{
        'px-2 sm:px-3': !hasHorzPaddingClass(),
        ...props.classList,
      }}
    >
      {props.children}
    </main>
  )
}

function isHorzPadding(cls?: string) {
  return cls?.startsWith('p-') || cls?.startsWith('px-')
}
