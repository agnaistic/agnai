import HeroContents from './HeroContents'

const Hero = () => {
  return (
    <div>
      <div class="hero z-[-1] bg-home-hero-mobile bg-cover bg-center bg-no-repeat sm:bg-home-hero-desktop sm:bg-contain sm:bg-right">
        <div class="bg-none bg-cover bg-left bg-no-repeat pb-10 sm:bg-home-hero-shadow ">
          <HeroContents />
        </div>
      </div>
    </div>
  )
}

export default Hero
