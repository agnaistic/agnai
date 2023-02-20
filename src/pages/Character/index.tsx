import { Route } from '@solidjs/router'
import { Component } from 'solid-js'
import CharacterChatList from './ChatList'
import CreateCharacter from './CreateCharacter'
import CharacterList from './CharacterList'
import CharacterSettings from './Settings'

const CharacterRoutes: Component = () => (
  <Route path="/character">
    <Route path="/create" component={CreateCharacter} />
    <Route path="/settings" component={CharacterSettings} />
    <Route path="/list" component={CharacterList} />
    <Route path="/detail/:id" component={CharacterChatList} />
  </Route>
)

export default CharacterRoutes
