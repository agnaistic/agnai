import { Component, createMemo } from 'solid-js'

const Badge: Component<{ children: any; bg?: string }> = (props) => {
  const bg = createMemo(() => props.bg || 'bg-red-500')

  return (
    <>
      <span
        class={`flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-bold text-white ${bg()}`}
      >
        {props.children}
      </span>
    </>
  )
}

export default Badge
