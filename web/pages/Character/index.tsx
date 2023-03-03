import { Route } from '@solidjs/router'
import { Component } from 'solid-js'
import CharacterChats from './CharacterChats'
import CreateCharacter from './CreateCharacter'
import CharacterList from './CharacterList'

const CharacterRoutes: Component = () => (
  <Route path="/character">
    <Route path="/create" component={CreateCharacter} />
    <Route path="/create/:duplicateId" component={CreateCharacter} />
    <Route path="/:editId/edit" component={CreateCharacter} />
    <Route path="/list" component={CharacterList} />
    <Route path="/:id/chats" component={CharacterChats} />
  </Route>
)

export default CharacterRoutes
