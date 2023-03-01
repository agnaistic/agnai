import { getGenSettings } from './presets'
import { ModelAdapter } from './type'

export const handleHorde: ModelAdapter = async function* ({
  char,
  chat,
  members,
  message,
  sender,
  prompt,
  user,
}) {
  if (!user.horde || !user.horde.key || !user.horde.model) {
    yield { error: `Horde request failed: Not configured` }
    return
  }

  const body = getGenSettings('basic', 'kobold')
}
