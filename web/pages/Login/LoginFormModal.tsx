import { createSignal, Show } from 'solid-js'
import './Modal.css'
import { userStore } from '/web/store'
import LoginFormSocialButtons from './LoginFromSocialButtons'

interface Props {
  onClickLogin?: any
}

const ENABLE_SOCIAL_LOGIN = false

const LoginFormModal = ({ onClickLogin }: Props) => {
  const user = userStore()

  const [showPassword, setShowPassword] = createSignal(false)

  const togglePasswordVisibile = () => {
    setShowPassword(!showPassword())
  }

  return (
    <Show when={user.showLogin}>
      <div
        class="fixed bottom-0  left-0 right-0 top-0  z-[49] flex h-screen items-center justify-center overflow-y-auto overflow-x-hidden bg-black/80 backdrop-blur"
        onClick={(e) => {
          userStore.loginModal(false)
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation()
          }}
          class="background m-5 w-full rounded-[22px] border-[1px] border-white p-[18px] backdrop-blur md:w-3/4 md:p-8 lg:w-1/2"
        >
          <div class="font-clash">
            <h3 class="mb-3 mt-1 font-clash-bold text-[32px] leading-normal text-[#4A72FF]">
              Log In
            </h3>
            <LoginFormSocialButtons show={ENABLE_SOCIAL_LOGIN} />
            <form onSubmit={onClickLogin}>
              <div class="mb-6 flex flex-col">
                <label for="username" class="mb-4 block font-clash-semibold text-lg text-white">
                  Username Or Email
                </label>
                <input
                  name="username"
                  placeholder="Enter Username Or Email"
                  class="rounded-xl border border-white bg-white/10 p-4 text-sm md:p-6 md:text-base"
                />
              </div>
              <div class="mb-4 flex flex-col">
                <label for="password" class="mb-4 block font-clash-semibold text-lg text-white">
                  Password
                </label>
                <div class="relative flex">
                  <input
                    name="password"
                    type={showPassword() ? 'text' : 'password'}
                    placeholder="Enter Password"
                    class="flex-1 rounded-xl border border-white bg-white/10 p-4 text-sm md:p-6 md:text-base"
                  />
                  <div class="absolute inset-y-0 right-4 flex items-center justify-center">
                    <button type="button" onClick={() => togglePasswordVisibile()}>
                      <img src="/images/solar-eye-linear.png" class="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between ">
                <div class="flex items-center justify-center gap-1">
                  <input
                    id="terms"
                    type="checkbox"
                    checked
                    class="focus:ring-3 focus:ring-primary-300 dark:focus:ring-primary-600 h-4 w-4 rounded border border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                  />

                  <label for="terms" class="block text-xs leading-6 text-white md:text-base">
                    Stay Logged In
                  </label>
                </div>
                <a class="text-xs text-[#10E0F9] md:text-base" href="#">
                  Forgot Password?
                </a>
              </div>
              <button
                type="submit"
                class="mb-3 mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-cosplay-blue-200 to-cosplay-purple font-clash-semibold text-white md:mb-5 md:mt-8 md:h-16"
              >
                Log In
              </button>
              <p class="mt-1 text-center text-sm text-white md:mt-2 md:text-base">
                Don’t Have An Account?&nbsp;&nbsp;
                <a onclick={onClickLogin} href="#" class="font-clash-semibold text-[#FF23FF]">
                  Sign Up
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default LoginFormModal
