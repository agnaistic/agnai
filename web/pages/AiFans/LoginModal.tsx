import { Component, createEffect } from 'solid-js'
import Modal from '/web/shared/Modal'
import { userStore } from '/web/store'
import { rootModalStore } from '/web/store/root-modal'
import LoginPage from '../Login'
import LoginFormModal from '../Login/LoginFormModal'

const LoginModal: Component = (props) => {
  rootModalStore.addModal({
    id: 'login-modal',
    element: <LoginPage />,
  })

  return null
}

export default LoginModal
