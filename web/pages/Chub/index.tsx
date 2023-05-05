import { Route } from '@solidjs/router'
import { Component, lazy } from 'solid-js'

const ChubRoutes: Component = () => <Route path="/chub" component={lazy(() => import('./Chub'))} />

export default ChubRoutes
