import PopularCard from './PopularCard'
import { faker } from '@faker-js/faker'

const Trending = () => {
  return (
    <div>
      <div class="w-full px-4 pt-4 md:py-10 lg:max-w-full lg:px-14 ">
        <div class="flex items-center justify-center md:justify-between">
          <p class="font-clash-display-variable text-[26px] font-bold text-white lg:text-[52px]">
            <span class="font-clash-display-variable bg-gradient-to-r from-[#EC655A] to-[#2BC0E4] bg-clip-text text-[26px] font-bold text-transparent lg:text-[52px]">
              Trending{' '}
            </span>
            Now
          </p>
          <button class="hidden w-52 flex-shrink-0 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 py-2 font-semibold text-white md:block lg:py-4">
            View All
          </button>
        </div>
        {/* CARDS */}

        <div class="mt-6 grid grid-cols-1 gap-6 md:mt-8 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((_) => {
            const name = faker.person.firstName()
            const image = faker.image.urlLoremFlickr({
              category: 'woman,beautiful,sexy',
            })
            return <PopularCard name={name} realName={name} image={image} />
          })}
        </div>
        <button class="my-4 h-10 w-full flex-shrink-0 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white md:hidden">
          View All
        </button>
      </div>
    </div>
  )
}

export default Trending
