import { Route } from '@solidjs/router'
import { Component } from 'solid-js'
import CreateCharacter from './Create'
import CharacterList from './List'
import CharacterSettings from './Settings'

const CharacterRoutes: Component = () => (
  <Route path="/character">
    <Route path="/create" component={CreateCharacter} />
    <Route path="/settings" component={CharacterSettings} />
    <Route path="/list" component={CharacterList} />
  </Route>
)

export default CharacterRoutes
