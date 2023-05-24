import { Route } from '@solidjs/router'
import { Component } from 'solid-js'
import NotificationList from './NotificationList'

const NotificationRoutes: Component = () => (
  <Route path="/notification">
    <Route path="/list" component={NotificationList} />
  </Route>
)

export default NotificationRoutes
