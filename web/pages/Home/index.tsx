import { Slider, createSlider } from 'solid-slider'

import Header from '/web/shared/aifans/Header'
import Footer from '/web/shared/aifans/Footer'
import Banner from '/web/shared/aifans/Banner'
import CosplayCard from '/web/shared/aifans/CosplayCard'
import CreatorCard from '/web/shared/aifans/CreatorCard'

import model4 from '/web/shared/assets/img/model4.png'
import creator2 from '/web/shared/assets/img/creator2.png'
import trending3 from '/web/shared/assets/img/trending3.png'
import profile0 from '/web/shared/assets/img/profile0.png'
import profile1 from '/web/shared/assets/img/profile1.png'
import profile2 from '/web/shared/assets/img/profile2.png'
import profile3 from '/web/shared/assets/img/profile3.png'
import profile4 from '/web/shared/assets/img/profile4.png'
import flag from '/web/shared/assets/img/flag.png'
import arrow_right from '/web/shared/assets/img/arrow-right.png'
import { createEffect, onMount } from 'solid-js'
import { characterStore } from '/web/store'
import { AppSchema } from '/common/types'
const images = [profile1, profile2, profile3, profile4]

export default function Home() {
  const options = {
    loop: true,
    slides: {
      perView: 4,
      spacing: 15,
    },
  }
  const [slider, { next, prev }] = createSlider(options)
  slider

  const chars = characterStore((s) => ({
    list: s.characters.list,
    map: s.characters.list.reduce<Record<string, AppSchema.Character>>(
      (prev, curr) => Object.assign(prev, { [curr._id]: curr }),
      {}
    ),
    loaded: s.characters.loaded,
  }))

  onMount(() => {
    if (!chars.loaded) {
      characterStore.getCharacters()
    }
  })

  createEffect(() => {
    // console.log('JB', chars.list)
  })

  return (
    <>
      <Header />
      <Banner />
      <div class=" bg-cover bg-top bg-no-repeat">
        <div id="popular-section" class="py-8 md:py-20">
          <div class="container mx-auto px-4">
            <div class="section-title flex items-center justify-center text-white md:justify-between">
              <h1 class="font-['ClashDisplay-Bold'] text-2xl md:text-5xl">
                Popular On <span class="custom-grad-title">Cosplay Fans</span>
              </h1>
              <button class="hidden rounded-xl bg-gradient-to-r from-[#B14DFF] to-[#4A72FF] px-12 py-4 font-['ClashDisplay-Semibold'] md:block">
                View All
              </button>
            </div>
            <div class="card-wrapper grid grid-cols-1 gap-5 py-6 md:grid-cols-2 md:py-14 xl:grid-cols-3">
              {chars.list.map((character) => (
                <CosplayCard
                  id={character._id}
                  img={character.avatar || model4}
                  name={character.name}
                  age="23"
                  country="USA"
                  author={character.name}
                  flag={flag}
                />
              ))}
            </div>
          </div>
        </div>
        <div id="spotlight-section" class="py-8 md:py-20">
          <div class="container mx-auto px-4">
            <div class="section-title flex items-center justify-center text-white md:justify-between">
              <h1 class="font-['ClashDisplay-Bold'] text-2xl md:text-5xl">
                Creator <span class="custom-grad-title2">Spotlight</span>
              </h1>
              <button class="hidden rounded-xl bg-gradient-to-r from-[#B14DFF] to-[#4A72FF] px-12 py-4 font-['ClashDisplay-Semibold'] md:block">
                View All
              </button>
            </div>
            <div class="card-wrapper grid grid-cols-1 gap-5 py-6 md:grid-cols-2 md:py-14 xl:grid-cols-3">
              <CreatorCard
                img={creator2}
                name="Black Widow"
                description="Come inside my personal profile page and checkout my private pictures! I also love long  conversations so come join me, I’m online all the time!"
                creator="Crystal Reed"
                views="22K"
                likes="6K"
              />
              <CreatorCard
                img={creator2}
                name="Black Widow"
                description="Come inside my personal profile page and checkout my private pictures! I also love long  conversations so come join me, I’m online all the time!"
                creator="Crystal Reed"
                views="22K"
                likes="6K"
              />
              <CreatorCard
                img={creator2}
                name="Black Widow"
                description="Come inside my personal profile page and checkout my private pictures! I also love long  conversations so come join me, I’m online all the time!"
                creator="Crystal Reed"
                views="22K"
                likes="6K"
              />
              <CreatorCard
                img={creator2}
                name="Black Widow"
                description="Come inside my personal profile page and checkout my private pictures! I also love long  conversations so come join me, I’m online all the time!"
                creator="Crystal Reed"
                views="22K"
                likes="6K"
              />
              <CreatorCard
                img={creator2}
                name="Black Widow"
                description="Come inside my personal profile page and checkout my private pictures! I also love long  conversations so come join me, I’m online all the time!"
                creator="Crystal Reed"
                views="22K"
                likes="6K"
              />
              <CreatorCard
                img={creator2}
                name="Black Widow"
                description="Come inside my personal profile page and checkout my private pictures! I also love long  conversations so come join me, I’m online all the time!"
                creator="Crystal Reed"
                views="22K"
                likes="6K"
              />
            </div>
          </div>
        </div>
        <div
          id="trending-section"
          class="bg-gradient-to-r from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0)]"
        >
          <div class="container mx-auto px-4 py-8 md:py-20">
            <div class="section-title text-white">
              <h1 class="text-center font-['ClashDisplay-Bold'] text-2xl md:text-5xl">
                <span class="custom-grad-title3">Trending </span>Now
              </h1>
            </div>
            <div class="card-wrapper grid grid-cols-1 gap-5 py-6 md:grid-cols-2 md:py-14 xl:grid-cols-3">
              <CosplayCard
                img={trending3}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={trending3}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={trending3}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={trending3}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={trending3}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={trending3}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
            </div>
          </div>
        </div>
        <div id="creators-section" class="py-8 md:py-20">
          <div class="container mx-auto px-4">
            <div class="section-title flex items-center justify-center text-white md:justify-between">
              <h1 class="font-['ClashDisplay-Bold'] text-2xl md:text-5xl">
                Online <span class="custom-grad-title4">Creators</span>
              </h1>
              <button class="hidden rounded-xl bg-gradient-to-r from-[#B14DFF] to-[#4A72FF] px-12 py-4 font-['ClashDisplay-Semibold'] md:block">
                View All
              </button>
            </div>
            <div class="card-wrapper grid grid-cols-1 gap-5 py-6 md:grid-cols-2 md:py-14 xl:grid-cols-3">
              <CosplayCard
                img={model4}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={model4}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={model4}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={model4}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={model4}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={model4}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
            </div>
          </div>
        </div>
        <div
          id="featured-section"
          class="bg-gradient-to-l from-[rgba(74,114,255,0.15)] to-[rgba(255,255,255,0)]"
        >
          <div class="mx-auto px-4 py-4">
            <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
              <img class="w-full rounded" src={profile0} alt="creator picture" />
              <div class="flex w-full flex-col justify-between md:w-4/5">
                <span class="title custom-grad-title5 font-['ClashDisplay-Semibold'] text-lg uppercase">
                  FEATURED CREATOR: CARRIE PINK
                </span>
                <h1 class="font-['ClashDisplay-Bold'] text-5xl text-white">Venom</h1>
                <div class="flex flex-wrap gap-2 uppercase">
                  <div class="rounded-full border border-[#4A72FF] px-2 py-2 text-sm text-[#4A72FF]">
                    view profile
                  </div>
                  <div class="rounded-full border border-[#4A72FF] px-2 py-2 text-sm text-[#4A72FF]">
                    live chat
                  </div>
                  <div class="rounded-full border border-[#4A72FF] px-2 py-2 text-sm text-[#4A72FF]">
                    message
                  </div>
                  <div class="rounded-full border border-[#4A72FF] px-2 py-2 text-sm text-[#4A72FF]">
                    subscribe
                  </div>
                </div>
                <p class="font-['ClashDisplay-Medium'] leading-8 text-white">
                  Hi I’m Carrie and I’m a top model on Cosplay Fans. This month I’m a featured
                  creator so I will be sharing some of my hottest content collection, and also
                  taking requests. I’m also online most of the time so if you would like to chat
                  just drop me line . Hope to hear from you soon!
                </p>
                <div class="mb-5 flex items-center gap-4">
                  <span class="custom-grad-title6 font-['ClashDisplay-Medium'] text-lg">
                    READ MORE
                  </span>
                  <img class="h-4" src={arrow_right} alt="arrow" />
                </div>
                <div class="f flex items-center justify-between text-[#10E0F9]">
                  <h2 class="font-['ClashDisplay-Bold'] text-3xl">See Profile</h2>
                  <div class="flex gap-4">
                    <div
                      class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border"
                      onClick={prev}
                    >
                      &lt
                    </div>
                    <div
                      class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border"
                      onClick={next}
                    >
                      &gt
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="pt-4 md:pt-14" use:slider>
              {images.map((src, idx) => (
                <div class="slide flex items-center justify-center">
                  <img src={src} alt="profile image" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div id="new-section" class="py-8 md:py-20">
          <div class="container mx-auto px-4">
            <div class="section-title text-center text-white">
              <h1 class="font-['ClashDisplay-Bold'] text-2xl md:text-5xl">
                New to <span class="custom-grad-title7">Cosplay Fans</span>
              </h1>
            </div>
            <div class="card-wrapper grid grid-cols-1 gap-5 py-6 md:grid-cols-2 md:py-14 xl:grid-cols-3">
              <CosplayCard
                img={model4}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={model4}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={model4}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={model4}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={model4}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
              <CosplayCard
                img={model4}
                name="Chun Li"
                age="23"
                country="USA"
                author="Megan Nix"
                flag={flag}
              />
            </div>
            <div class="flex justify-center text-white">
              <button class="hidden rounded-xl bg-gradient-to-r from-[#B14DFF] to-[#4A72FF] px-12 py-4 font-['ClashDisplay-Semibold'] md:block">
                View All
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
