import { Route } from '@solidjs/router'
import { Component, lazy } from 'solid-js'

const CharacterRoutes: Component = () => (
  <Route path="/character">
    <Route path="/create" component={lazy(() => import('./CreateCharacter'))} />
    <Route path="/create/:duplicateId" component={lazy(() => import('./CreateCharacter'))} />
    <Route path="/:editId/edit" component={lazy(() => import('./CreateCharacter'))} />
    <Route path="/list" component={lazy(() => import('./CharacterList'))} />
    <Route path="/:id/chats" component={lazy(() => import('./ChatList'))} />
  </Route>
)

export default CharacterRoutes
