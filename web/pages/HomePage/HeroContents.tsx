import Image1 from '/web/asset/aifans/svg/hero-img-1.svg'
import FlameIcon from '/web/asset/aifans/svg/flameIcon.svg'
import UsersImage from '/web/asset/aifans/svg/bottomimage.svg'

const HeroContents = () => {
  return (
    <div class="container mx-auto px-4 py-4 lg:max-w-full lg:px-14 ">
      <div class="flex">
        <div class="pt-32 md:w-1/2">
          <div class="">
            <h1 class="text-shadow font-displayBold text-3xl text-[16px] text-cyan-400 md:text-[26px] lg:text-[22px]  xl:text-[30px]">
              FEATURED CREATOR
            </h1>
            <h1 class="text-shadow font-displayBold text-3xl text-white md:mt-4 md:text-[48px]  lg:text-[42px] xl:mt-8 xl:text-[60px]">
              Candice Nice&nbsp;
              <span class="text-[16px] md:text-[32px] lg:text-[40px] xl:text-[48px]">as</span>
            </h1>
            <div class=" mt-0 w-[150px] md:w-[350px] lg:hidden ">
              <img class="" src={Image1} alt="hero-image" />
            </div>
            {/* large screen */}
            <p class="mr-10 mt-4 hidden text-justify font-display text-[16px] leading-[34px]  text-white md:mr-16 lg:block xl:mr-40 2xl:text-[20px]">
              With her infectious energy and impeccable attention to detail, she brings the iconic
              character to life in a whirlwind of color and chaos. From her playful demeanor to her
              penchant for mischief, Candice captivates audiences with her boundless enthusiasm for
              embodying Gotham's most enigmatic villainess...{' '}
              <a
                class="font-display text-[20px] font-medium leading-[34px] text-[#FF23FF]"
                href="#"
              >
                Read More
              </a>
            </p>
            <div class="mt-8 hidden items-center gap-2 lg:flex">
              <img class="md:h-[35px] md:w-[35px]" src={FlameIcon} alt="flame" />
              <p class="font-displayMedium text-[18px] text-white shadow-black/40 drop-shadow-md md:text-[22px]">
                Subscribe and gain ACCESS to daily uploaded content!
              </p>
            </div>

            <div class="mt-4 hidden items-center gap-2 lg:flex">
              <img class="md:h-[35px] md:w-[35px]" src={FlameIcon} alt="flame" />
              <p class="font-displayMedium text-[18px] text-white drop-shadow-md md:text-[22px]">
                Live Messaging 24/7!
              </p>
            </div>
            {/* small screen */}
            <div class="mt-20 flex items-center gap-2 lg:hidden">
              <img class="h-[26px] w-[26px] md:h-[35px] md:w-[35px]" src={FlameIcon} alt="flame" />
              <p class="font-displayMedium text-[18px] text-white drop-shadow-md md:text-[22px] md:font-[600]">
                Voice Calling 24/7
              </p>
            </div>
            <div class="mt-3 flex items-center gap-2 lg:hidden">
              <img class="h-[26px] w-[26px] md:h-[35px] md:w-[35px]" src={FlameIcon} alt="flame" />
              <p class="font-displayMedium text-[18px] text-white drop-shadow-md md:text-[22px] md:font-[600]">
                Live Chat 24/7
              </p>
            </div>
            <div class="mt-3 flex items-center gap-2 lg:hidden">
              <img class="h-[26px] w-[26px] md:h-[35px] md:w-[35px]" src={FlameIcon} alt="flame" />
              <p class="font-displayMedium text-[18px] text-white drop-shadow-md md:text-[22px] md:font-[600]">
                Generate Custom Content!
              </p>
            </div>
            <button class="m-0 hidden  flex-shrink-0 rounded-lg border bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-displayMedium text-[20px] text-white md:mt-8 md:block">
              Register for Free
            </button>
          </div>
        </div>

        <div class="relative hidden h-[120px] w-[180px] items-center justify-start md:h-[335.57px] md:w-[600px] lg:flex">
          <img
            class="absolute left-[-100px] top-[45px] w-[400px] 2xl:left-[-200px] 2xl:w-[500px]"
            src={Image1}
            alt="hero-image"
          />
        </div>
      </div>

      <div class="my-8 hidden md:flex">
        <div class="shadow-hero">
          <img
            class="h-[232px] rounded-lg border-[3px] border-white"
            src="/images/harley-quinn-hero-sm1.png"
          />
        </div>
        <div class="ml-5 shadow-hero">
          <img
            class="h-[232px] rounded-lg border-[3px] border-white"
            src="/images/harley-quinn-hero-sm2.png"
          />
        </div>
      </div>
      <a
        class="hidden items-center gap-1 font-display text-[#F00] hover:underline md:flex lg:hidden 2xl:flex "
        href=""
      >
        See Profile{' '}
        <svg
          fill="currentColor"
          stroke-width="0"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 320 512"
          height="1em"
          width="1em"
          style="overflow: visible; color: currentcolor;"
        >
          <path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"></path>
        </svg>
      </a>

      <button
        onclick={() => alert('sign up click')}
        class="mt-8 h-[52px] w-[175px] flex-shrink-0 rounded-[12px] border bg-gradient-to-r from-purple-600 to-blue-600 px-3 text-[16px] text-white md:hidden"
      >
        Register For Free
      </button>
    </div>
  )
}

export default HeroContents
