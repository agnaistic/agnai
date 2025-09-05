import { SetStoreFunction } from 'solid-js/store'
import { AppSchema } from '/common/types'

export type ConfigState = AppSchema.Configuration

export type ConfigSetters = SetStoreFunction<ConfigState>
