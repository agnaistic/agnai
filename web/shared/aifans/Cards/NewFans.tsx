import cardImg from '/static/images/card-image1.png'
import flag from '/static/images/flag.png'

const NewFans = () => {
  return (
    <div class="container mx-auto w-full px-4 pb-20 pt-3 md:py-10 lg:max-w-full lg:px-14">
      <div class="flex items-center justify-center md:justify-between">
        <p class="font-clash-display-variable text-[26px] font-bold text-white lg:text-[52px]">
          New to{' '}
          <span class="font-clash-display-variable bg-gradient-to-r from-yellow-300 to-cyan-400 bg-clip-text text-[26px] font-bold text-transparent lg:text-[52px]">
            Cosplay Fans
          </span>
        </p>
        <button class="hidden w-52 flex-shrink-0 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 py-2 font-semibold text-white md:block lg:py-4">
          View All
        </button>
      </div>
      {/* CARDS */}

      <div class="mt-6 grid grid-cols-1 gap-3 md:mt-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((_) => (
          <div class="group relative mt-3">
            <img class="h-[380px] w-full rounded-lg " src={cardImg} alt="user" />
            <div
              class={`group-hover:backdrop-blur-2 " } absolute bottom-0 w-full rounded-b-lg bg-black/70 from-purple-600 to-blue-600
                            group-hover:bg-gradient-to-r`}
            >
              <div class="flex items-center justify-between p-2">
                <div class="flex items-center gap-3">
                  <img
                    class="h-[47px] w-[47px] rounded-full border-2 border-[#10E0F9]"
                    src={cardImg}
                    alt="user"
                  />
                  <div>
                    <h3 class="font-clash-display-variable text-[18px] font-medium text-white">
                      Chun Li
                    </h3>
                    <div class="flex items-center gap-1">
                      <span class="font-clash-display-variable text-xs font-semibold uppercase leading-normal text-cyan-400">
                        23
                      </span>
                      <span class="font-clash-display-variable text-xs font-semibold uppercase leading-normal text-cyan-400">
                        USA
                      </span>
                      <img class="h-[9.771px] w-[14.543px]" src={flag} alt="flag" />
                    </div>
                  </div>
                </div>
                <div class="font-clash-display-variable rounded-2xl bg-cyan-400/30 px-3 py-1 text-center text-sm font-medium text-cyan-400">
                  Megan Nix
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button class="my-4 h-10 w-full flex-shrink-0 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white md:hidden">
        View All
      </button>
    </div>
  )
}

export default NewFans
