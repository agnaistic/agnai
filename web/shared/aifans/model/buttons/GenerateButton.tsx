import generateIcon from '/web/asset/aifans/generate-button-icon.png'

interface Props {
  title?: string
  onClick?: () => void
  centered?: boolean
}

const GenerateButton = ({ title, onClick, centered }: Props) => {
  const style = centered
    ? 'h-[42px] md:pr-3 md:text-base justify-center'
    : 'h-12 md:h-9 md:pr-3 md:text-[15px] justify-between'

  return (
    <button
      onClick={onClick}
      class={`${style} flex h-12 w-full items-center rounded-md border border-white bg-gradient-to-r from-[#B14DFF] to-[#4A72FF] pl-3 pr-[17px]  font-clash text-xl font-bold lg:flex-row-reverse `}
    >
      <span>{title || 'GENERATE'}</span>
      <img src={generateIcon} class="ml-3 w-[20px] md:ml-0 md:mr-3" />
    </button>
  )
}

export default GenerateButton
