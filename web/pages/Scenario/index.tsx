import { Route } from '@solidjs/router'
import { Component, lazy } from 'solid-js'

const ScenarioRoutes: Component = () => (
  <Route path="/scenario">
    <Route path="/" component={lazy(() => import('./ScenarioList'))} />
    <Route path="/:editId" component={lazy(() => import('./EditScenario'))} />
    <Route path="/:editId/events" component={lazy(() => import('./EditScenarioEvents'))} />
  </Route>
)

export default ScenarioRoutes
