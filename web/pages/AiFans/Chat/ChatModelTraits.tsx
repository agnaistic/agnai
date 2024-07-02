import ModelAttribute from '../../../shared/aifans/model/ModelAttritube'

const ChatModelTraits = (props: any) => {
  return (
    <div>
      <div class="mb-2 px-8 pt-[18px] font-clash">ABOUT ME:</div>
      <div
        class={`grid grid-cols-2 gap-x-8 gap-y-3 border-b border-b-cosplay-gray-100 px-8 pb-[18px]`}
      >
        <ModelAttribute title="PERSONALITY" value="Outgoing, Seductive" />
        <ModelAttribute title="OCCUPATION" value="Influencer" />
        <ModelAttribute title="HOBBIES" value="Photography, Fitness" />
        <ModelAttribute title="RELATIONSHIP" value="Single" />
      </div>
      <div class={`grid grid-cols-2 gap-x-8 gap-y-3 px-8 py-[18px]`}>
        <ModelAttribute title="BODY" value="Fit" />
        <ModelAttribute title="AGE" value="25" />
        <ModelAttribute title="BUTT" value="Medium" />
        <ModelAttribute title="Hair" value="Long, Black" />
        <ModelAttribute title="BREAST" value="Huge Breast" />
        <ModelAttribute title="ETHNICITY" value="American" />
      </div>
    </div>
  )
}

export default ChatModelTraits
