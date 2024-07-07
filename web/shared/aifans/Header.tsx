import { A, useNavigate } from '@solidjs/router'
import { userStore } from '/web/store'
import { isLoggedIn } from '/web/store/api'
import Logo from '/web/asset/aifans/svg/logo.svg'
import Button from '../Button'

const Header = () => {
  const nav = useNavigate()
  const user = userStore()

  return (
    <div class="flex  items-center justify-between font-clash md:h-[98px] ">
      <div class="flex items-center gap-2">
        <button class="mb-1 block flex-shrink-0 lg:hidden">
          <img src="/images/burger.png" alt="" class="h-[35px] w-[35px]" />
        </button>
        <A href="/">
          <img class="h-[26.43px]  w-[120px] md:h-[43.43px]  md:w-[200px]" src={Logo} alt="logo" />
        </A>
      </div>
      <div class="flex items-center justify-center gap-6 lg:gap-3">
        <button class="bg-opacity-7 text-shadow hidden h-7 w-28 flex-shrink-0 rounded-md border border-white bg-[#0000001e] font-clash text-xs font-medium text-white shadow backdrop-blur lg:block">
          CREATORS
        </button>
        <button
          onClick={() => {
            if (!isLoggedIn()) {
              userStore.loginModal(true)
            } else {
              return nav('/chat/')
            }
          }}
          class="bg-opacity-7 text-shadow hidden h-7 w-28 flex-shrink-0 items-center justify-center rounded-md border border-white bg-[#0000001e] font-clash text-xs font-medium text-white shadow backdrop-blur lg:flex"
        >
          LIVE CHAT
        </button>
        <button
          onClick={() => {
            if (!isLoggedIn()) {
              userStore.loginModal(true)
            }
          }}
          class="bg-opacity-7 bg-blur text-shadow h-[28px] w-[86px] flex-shrink-0 rounded-md border bg-red-500 font-clash text-xs font-medium text-white shadow lg:h-7 lg:w-28"
        >
          BUY TOKENS
        </button>
        {!isLoggedIn() && (
          <button
            onClick={() => userStore.loginModal(true)}
            class="text-shadow hidden h-[30px] w-[90px] flex-shrink-0 rounded-md border border-white bg-gradient-to-r from-purple-600 to-blue-600 font-clash text-xs font-medium text-white shadow lg:block"
          >
            SIGN IN
          </button>
        )}
        {isLoggedIn() && (
          <Button
            schema="warning"
            onClick={() => {
              userStore.logout()
              window.location.reload()
            }}
            class="text-shadow hidden h-[30px] w-[90px] flex-shrink-0 items-center justify-center rounded-md border border-white bg-gradient-to-r from-purple-600 to-blue-600 font-clash text-xs font-medium text-white shadow lg:flex"
          >
            {user.profile?.handle}
            <img src="/images/chevron-icon-down-white.png" class="h-[7px] w-[10px]" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default Header
