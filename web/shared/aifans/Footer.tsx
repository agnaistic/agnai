import footer_logo from '../assets/img/footer-logo.png'
import mask_group from '../assets/img/mask-group.png'
import card1 from '../assets/img/paypay.png'
import card2 from '../assets/img/visa.png'
import card3 from '../assets/img/discover.png'
import card4 from '../assets/img/mastercard.png'

export default function Footer() {
  return (
    <div
      id="footer"
      class="bg-gradient-to-b from-[rgba(74,114,255,0.06)] to-[rgba(16,224,249,0.06)] py-10 text-white"
    >
      <div class="container mx-auto px-4">
        <div class="text-center">
          <img class="mx-auto w-[30px] md:w-[55px]" src={footer_logo} alt="logo" />
          <h3 class="my-6 font-['ClashDisplay-Semibold'] text-[20px] md:text-[32px]">
            Cosplay Fans
          </h3>
          <div class="mx-auto max-w-2xl">
            <p class="font-display text-[14px] md:font-displayMedium md:text-[22px]">
              Cosplay Fans powers immersive experiences with your favorite cosplay creators,
              allowing users to live chat and view private content.
            </p>
          </div>
        </div>
        <div class="my-6 grid grid-cols-2 gap-2 md:flex md:grid-cols-4 md:flex-row md:justify-between">
          <div>
            <h3 class="font-['ClashDisplay-Bold'] text-[20px] text-[#4A72FF] md:text-[30px]">
              Information
            </h3>
            <div class="font-display text-[14px] md:font-displayMedium md:text-lg">
              <p class="my-4">Live Chat</p>
              <p class="my-4">Creators</p>
              <p class="my-4">FAQ</p>
              <p class="my-4">Blog</p>
            </div>
          </div>
          <div>
            <h3 class="font-['ClashDisplay-Bold'] text-[20px] text-[#4A72FF] md:text-[30px]">
              Privacy Policy
            </h3>
            <div class="font-display text-[14px] md:font-displayMedium md:text-lg">
              <p class="my-4">Terms of Service</p>
              <p class="my-4">2257 Statement</p>
              <p class="my-4">DMCA Policy</p>
              <p class="my-4">Buyer/Seller Agreements</p>
            </div>
          </div>
          <div>
            <h3 class="font-['ClashDisplay-Bold'] text-[20px] text-[#4A72FF] md:text-[30px]">
              Contact Us
            </h3>
            <div class="text-[14px]md:font-displayMedium font-display md:text-lg">
              <p class="my-4">Billing</p>
              <p class="my-4">Support</p>
              <p class="my-4">Become a Creator</p>
            </div>
          </div>
          <img class="max-w-[60%]" src={mask_group} alt="mask_group" />
        </div>
        <hr />
        <div class="mt-10 grid grid-cols-1 md:grid-cols-2">
          <div class="mb-6 flex justify-center gap-2 md:justify-start">
            <img class="h-[28px] w-[50px] md:h-[49px] md:w-[88px]" src={card1} alt="payment card" />
            <img class="h-[28px] w-[50px] md:h-[49px] md:w-[88px]" src={card2} alt="payment card" />
            <img class="h-[28px] w-[50px] md:h-[49px] md:w-[88px]" src={card3} alt="payment card" />
            <img class="h-[28px] w-[50px] md:h-[49px] md:w-[88px]" src={card4} alt="payment card" />
          </div>
          <div class="flex justify-center md:justify-end">
            <div class="inline-block text-center font-display text-[14px] md:text-left md:font-displayMedium md:text-lg">
              <p>All Rights Reserved 2024</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
