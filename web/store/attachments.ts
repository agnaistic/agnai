import { events } from '../emitter'
import { storage } from '../shared/util'
import { MsgAttachment } from '/srv/adapter/type'

events.on('msg-attachment', async (msgId: string, attachments: MsgAttachment[]) => {
  if (!attachments?.length) {
    await storage.removeItem(getId(msgId))
    return
  }

  await storage.setItem(getId(msgId), JSON.stringify(attachments || []))
})

export async function getSavedMsgAttachments(msgId: string): Promise<MsgAttachment[]> {
  const attachments = await storage.getItem(getId(msgId))
  if (!attachments) return []

  try {
    const list = JSON.parse(attachments)
    if (Array.isArray(list)) return list
  } catch (ex) {}

  return []
}

function getId(id: string) {
  return `attachments_${id}`
}
