import NewFans from './NewFans'
import OnlineCreators from './OnlineCreators'
import Popular from './Popular'
import Spotlight from './Spotlight'
import Trending from './Trending'
import { AppSchema } from '/common/types'

interface Props {
  popular?: AppSchema.Character[]
}

function Card(props: Props) {
  const imageUrl = '/images/main-bg.png'

  return (
    <div class="w-full pt-20 md:px-5  md:py-[27px] lg:px-[20px] xl:px-[40px] 2xl:mx-auto 2xl:max-w-[1775px] ">
      <div
        style={{
          background: `url(${imageUrl})`,
          'background-size': 'cover',
          'background-position': 'center',
        }}
      >
        <Popular chars={props.popular} />
        <Spotlight />

        <div
          style={{
            background: ' linear-gradient(90deg, #263131 50% ,#0b0e0e 100%)',
          }}
        >
          <Trending />
        </div>
        <OnlineCreators />
        <NewFans />
      </div>
    </div>
  )
}

export default Card
