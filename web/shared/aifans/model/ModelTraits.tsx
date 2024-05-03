import ModelAttribute from './ModelAttritube'

import personalityIcon from '/web/asset/aifans/traits-icons-personality.png'
import occupationIcon from '/web/asset/aifans/traits-icons-occupation.png'
import hobbiesIcon from '/web/asset/aifans/traits-icons-hobbies.png'
import relationshipIcon from '/web/asset/aifans/traits-icons-relationship.png'
import bodyIcon from '/web/asset/aifans/traits-icons-body.png'
import ageIcon from '/web/asset/aifans/traits-icons-age.png'
import buttIcon from '/web/asset/aifans/traits-icons-butt.png'
import hairIcon from '/web/asset/aifans/traits-icons-hair.png'
import breastIcon from '/web/asset/aifans/traits-icons-breasts.png'
import ethnicityIcon from '/web/asset/aifans/traits-icons-ethnicity.png'

const ModelTraits = (props: any) => {
  return (
    <div>
      <div class="mb-2 mt-10 font-display md:mt-8">ABOUT ME:</div>
      <div class="grid grid-cols-2 gap-x-10 gap-y-10 md:gap-x-20 md:gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
        <ModelAttribute title="PERSONALITY" value="Outgoing, Seductive" image={personalityIcon} />
        <ModelAttribute title="OCCUPATION" value="Influencer" image={occupationIcon} />
        <ModelAttribute title="HOBBIES" value="Photography, Fitness" image={hobbiesIcon} />
        <ModelAttribute title="RELATIONSHIP" value="Single" image={relationshipIcon} />
        <ModelAttribute title="BODY" value="Fit" image={bodyIcon} />
        <ModelAttribute title="AGE" value="25" image={ageIcon} />
        <ModelAttribute title="BUTT" value="Medium" image={buttIcon} />
        <ModelAttribute title="Hair" value="Long, Black" image={hairIcon} />
        <ModelAttribute title="BREAST" value="Huge Breast" image={breastIcon} />
        <ModelAttribute title="ETHNICITY" value="American" image={ethnicityIcon} />
      </div>
    </div>
  )
}

export default ModelTraits
