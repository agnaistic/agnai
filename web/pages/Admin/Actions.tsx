import { Component, Setter } from 'solid-js'
import { AppSchema } from '/common/types'

export const ActionCalls: Component<{
  setActions: Setter<AppSchema.ActionCall[]>
  actions: AppSchema.ActionCall[]
}> = (props) => {
  return null
}
