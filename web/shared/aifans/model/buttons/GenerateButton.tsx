import generateIcon from '/web/asset/aifans/generate-button-icon.png'

const GenerateButton = () => {
  return (
    <button
      class={`mb-3 flex h-12 w-full items-center justify-between rounded-md border border-white bg-gradient-to-r from-[#B14DFF] to-[#4A72FF] pl-3 pr-[17px]  font-display text-xl font-bold md:h-9  md:pr-3 md:text-[15px] lg:flex-row-reverse `}
    >
      <span>GENERATE</span>
      <img src={generateIcon} class="ml-3 w-[20px] md:ml-0 md:mr-3" />
    </button>
  )
}

export default GenerateButton
