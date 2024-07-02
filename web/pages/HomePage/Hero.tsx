import HeroContents from './HeroContents'

const Hero = () => {
  return (
    <div>
      <div class="hero z-[-1] bg-home-hero-mobile bg-cover bg-center bg-no-repeat lg:bg-home-hero-desktop lg:bg-right xl:bg-contain">
        <div class="bg-none bg-cover bg-left bg-no-repeat pb-10 md:bg-[left_-350px_center] lg:bg-home-hero-shadow xl:bg-left">
          <HeroContents />
        </div>
      </div>
    </div>
  )
}

export default Hero
