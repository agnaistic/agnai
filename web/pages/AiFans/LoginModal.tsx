import { Component } from 'solid-js'
import Modal from '/web/shared/Modal'
import { userStore } from '/web/store'
import { rootModalStore } from '/web/store/root-modal'
import LoginPage from '../Login'

const LoginModal: Component = (props) => {
  const user = userStore()

  rootModalStore.addModal({
    id: 'login-modal',
    element: (
      <Modal
        show={user.showLogin}
        close={() => userStore.loginModal(false)}
        maxWidth="half"
        fixedHeight
      >
        <LoginPage />
      </Modal>
    ),
  })

  return null
}

export default LoginModal
