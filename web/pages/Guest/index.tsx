import { Route } from '@solidjs/router'
import { Component } from 'solid-js'
import GuestCharacterForm from './GuestCharacterForm'
import GuestCharacterList from './GuestCharacterList'
import GuestProfile from './GuestProfile'
import GuestSettings from './GuestSettings'

const GuestRouter: Component = () => (
  <Route path="/guest">
    <Route path="/profile" component={GuestProfile} />
    <Route path="/settings" component={GuestSettings} />
    <Route path="/character/list" component={GuestCharacterList} />
    <Route path="/character/create" component={GuestCharacterForm} />
    <Route path="/character/create/:duplicateId" component={GuestCharacterForm} />
    <Route path="/character/:editId/edit" component={GuestCharacterForm} />
  </Route>
)

export default GuestRouter
