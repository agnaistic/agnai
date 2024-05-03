import author from '/web/shared/assets/img/author.png'
import flame from '/web/shared/assets/img/flame.png'
import thumb1 from '/web/shared/assets/img/thumb1.png'
import thumb2 from '/web/shared/assets/img/thumb2.png'

export default function Banner() {
  return (
    <div id="hero-banner" class="relative h-screen">
      <div
        id="banner-img"
        class="absolute right-0 top-0 -z-10 h-screen w-full bg-[url('/web/shared/assets/img/hero.png')] bg-cover bg-[center_right_-12rem] bg-no-repeat md:bg-right"
      ></div>
      <div class="container mx-auto h-full pt-32 md:flex md:flex-col-reverse ">
        <div class="banner-text px-4 text-white lg:w-1/2">
          <div class="title grid grid-cols-4 gap-1">
            <div class="col-span-4 lg:col-span-2 xl:col-span-3">
              <h3 class="mb-2 font-['ClashDisplay-Semibold'] text-base uppercase text-[#10E0F9] md:mb-4 md:text-2xl">
                Featured creator
              </h3>
              <h1 class="mb-3 font-['ClashDisplay-Bold'] text-4xl md:mb-8 md:text-6xl">
                Candice Nice <span class="text-4xl text-white md:text-5xl">as</span>
              </h1>
            </div>
            <div class="col-span-4 flex items-end lg:col-span-2 xl:col-span-1">
              <img src={author} alt="creator name" class="mb-8" />
            </div>
          </div>
          <div class="content hidden font-['ClashDisplay-Medium'] leading-8 xl:block">
            <p>
              With her infectious energy and impeccable attention to detail, she brings the iconic
              character to life in a whirlwind of color and chaos. From her playful demeanor to her
              penchant for mischief, Candice captivates audiences with her boundless enthusiasm for
              embodying Gotham"s most enigmatic villainess...{' '}
              <span class="text-[#FF23FF]">Read More</span>
            </p>
          </div>
          <div class="service-list mb-10 font-['ClashDisplay-Semibold'] text-base md:text-lg">
            <div class="my-4 flex items-center">
              <img class="mr-2 h-7 w-6" src={flame} alt="list flame" />
              <p>Subscribe and gain ACCESS to daily uploaded content!</p>
            </div>
            <div class="my-4 flex items-center">
              <img class="mr-2 h-7 w-6" src={flame} alt="list flame" />
              <p>Live Messaging 24/7!</p>
            </div>
          </div>
          <button class="mb-16 rounded-xl border border-white bg-gradient-to-r from-[#B14DFF] to-[#4A72FF] px-8 py-4 font-['ClashDisplay-Semibold']">
            Register For Free
          </button>
          <div class="thumb-wrapper mb-4 hidden gap-6 md:flex">
            <div class="thumb rounded-xl border-2 border-white">
              <img src={thumb1} alt="thumbnail image" />
            </div>
            <div class="thumb rounded-xl border-2 border-white">
              <img src={thumb2} alt="thumbnail image" />
            </div>
          </div>
          <span class="mb-8 hidden text-[#FF0000] md:block">See Profile &gt</span>
        </div>
      </div>
    </div>
  )
}
