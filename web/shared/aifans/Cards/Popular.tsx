import { createEffect } from 'solid-js'
import PopularCard from './PopularCard'
import { AppSchema } from '/common/types'

interface Props {
  chars?: AppSchema.Character[]
}

const Popular = (props: Props) => {
  createEffect(() => {
    console.log('Popular chars', props.chars)
  })
  return (
    <div>
      <div class="w-full px-4 pt-4 md:py-10 lg:max-w-full lg:px-14 ">
        <div class="flex items-center justify-center md:my-5 md:justify-between ">
          <p class="font-clash-bold  text-[26px] text-white lg:text-[52px]">
            Popular On{' '}
            <span class="bg-gradient-to-r from-[#FF23FF] to-[#10E0F9] bg-clip-text font-clash-bold text-[26px] font-bold text-transparent lg:text-[52px]">
              Cosplay Fans
            </span>
          </p>
          <button class="hidden w-52 flex-shrink-0 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 py-2 font-clash-semibold text-white md:block lg:py-4">
            View All
          </button>
        </div>
        <div class="mt-6 grid grid-cols-1 gap-6 md:mt-8 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {props.chars?.map((character) => {
            console.log('char card', character)
            return (
              <PopularCard
                id={character._id}
                image={character.avatar}
                name={character.name}
                realName={character.name}
              />
            )
          })}
        </div>
        <button class="my-4 h-10 w-full flex-shrink-0 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 font-clash-semibold text-white md:hidden">
          View All
        </button>
      </div>
    </div>
  )
}

export default Popular
