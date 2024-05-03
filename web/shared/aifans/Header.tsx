import { A } from '@solidjs/router'
import { userStore } from '/web/store'
import { isLoggedIn } from '/web/store/api'
import Logo from '/web/asset/aifans/logo.svg'

const Header = () => {
  return (
    <div class="flex  items-center justify-between py-2 font-display md:py-[27px] ">
      <A href="/">
        <img class="h-[26.43px]  w-[120px] md:h-[43.43px]  md:w-[200px]" src={Logo} alt="logo" />
      </A>
      <div class="flex items-center justify-center gap-6 lg:gap-3">
        <button class="bg-opacity-7 text-shadow font-clash hidden h-7 w-28 flex-shrink-0 rounded-md border border-white bg-[#0000001e] text-xs font-medium text-white shadow backdrop-blur lg:block">
          CREATORS
        </button>
        <button class="bg-opacity-7 text-shadow font-clash hidden h-7 w-28 flex-shrink-0 rounded-md border border-white bg-[#0000001e] text-xs font-medium text-white shadow backdrop-blur lg:block">
          LIVE CHAT
        </button>
        <button class="bg-opacity-7 bg-blur text-shadow font-clash h-[28px] w-[86px] flex-shrink-0 rounded-md border bg-red-500 text-xs font-medium text-white shadow lg:h-7 lg:w-28">
          BUY TOKENS
        </button>
        {!isLoggedIn() && (
          <button
            onClick={() => userStore.loginModal(true)}
            class="text-shadow font-clash hidden h-[30px] w-[90px] flex-shrink-0 rounded-md border border-white bg-gradient-to-r from-purple-600 to-blue-600 text-xs font-medium text-white shadow lg:block"
          >
            SIGN IN
          </button>
        )}
        <button class="block flex-shrink-0 lg:hidden ">
          <img src="/images/burger.png" alt="" class="h-[22px] w-[35px]" />
        </button>
      </div>
    </div>
  )
}

export default Header
