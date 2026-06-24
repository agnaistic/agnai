import { Component, createMemo, createSignal, Show } from 'solid-js'
import { adminStore, toastStore } from '/web/store'
import { Card } from '/web/shared/Card'
import TextInput from '/web/shared/TextInput'
import Select from '/web/shared/Select'
import Button from '/web/shared/Button'
import { Toggle } from '/web/shared/Toggle'
import { createStore } from 'solid-js/store'
import { v4 } from 'uuid'
import { SaveIcon } from 'lucide-solid'
import { FeatureAccess } from '/common/types/admin'

export const EmbeddingConfig: Component = () => {
  const state = adminStore((s) => ({ config: s.config }))

  const [editId, setEditId] = createSignal('')
  const [selected, setSelected] = createSignal(state.config?.embedding || '')
  const [newEmbed, setNewEmbed] = createStore({
    url: '',
    key: '',
    batch: true,
    inputProp: '',
    model: '',
  })

  const availableEmbeds = createMemo(() => {
    const list: Array<{ label: string; value: string }> = [{ label: '无', value: '' }]
    if (!state.config?.embeddings?.length) return list

    for (const embed of state.config.embeddings) {
      try {
        const url = new URL(embed.url)
        list.push({ label: `${url.hostname}: ${embed.model.toLowerCase()}`, value: embed._id })
      } catch (ex) {
        const base = embed.url.replace('https://', '').split('/')[0]
        if (!base) continue

        list.push({ label: `${base}: ${embed.model}`, value: embed._id })
      }
    }

    return list
  })

  const editableEmbeds = createMemo(() => {
    const list = availableEmbeds().slice(1)
    list.unshift({ label: '新建嵌入', value: '' })
    return list
  })

  const current = createMemo(() => {
    const list = availableEmbeds()

    if (!state.config?.embedding) return noneSelected
    if (!list.length) return noneSelected

    const match = list.find((item) => item.value === state.config?.embedding)
    if (!match) return noneSelected

    return match
  })

  const assignEmbedding = () => {
    adminStore.assignEmbedding(selected())
  }

  const createEmbed = () => {
    if (!newEmbed.url || !newEmbed.key || !newEmbed.model) {
      toastStore.error(`缺少必填字段（url、key、model）`)
      return
    }

    adminStore.createEmbedding({ _id: v4(), ...newEmbed }, () => {
      setNewEmbed({ model: '', url: '', key: '', batch: true, inputProp: '' })
    })
  }

  const updateEmbed = () => {
    if (!editId()) {
      toastStore.error(`无法更新嵌入：没有 ID`)
      return
    }

    if (!newEmbed.url || !newEmbed.model) {
      toastStore.error(`缺少必填字段（url、key、model）`)
      return
    }

    adminStore.updateEmbedding({ ...newEmbed, _id: editId() })
  }

  const selectEmbed = (id: string) => {
    if (id === '') {
      setNewEmbed({ model: '', url: '', key: '', batch: true, inputProp: '' })
      return
    }

    setEditId(id)
    const match = state.config?.embeddings?.find((embed) => embed._id === id)
    if (!match) {
      setNewEmbed({ model: '', url: '', key: '', batch: true, inputProp: '' })
      return
    }

    setNewEmbed({ ...match, key: '' })
  }

  return (
    <>
      <Card class="bg-500">
        <Select
          label="嵌入访问等级"
          value={state.config?.embeddingsAccess}
          items={[
            { label: '无', value: 'off' },
            { label: '全部', value: 'all' },
            { label: '用户', value: 'users' },
            { label: '订阅用户', value: 'subscribers' },
            { label: '管理员', value: 'admins' },
          ]}
          onChange={(ev) =>
            adminStore.updateConfigPartial({ embeddingsAccess: ev.value as FeatureAccess })
          }
        />
        <TextInput disabled label="当前嵌入" value={current().label} />

        <div class="flex items-end gap-1">
          <Select
            items={availableEmbeds()}
            value={selected()}
            onChange={(item) => setSelected(item.value)}
            label="嵌入"
          />
          <Button onClick={() => assignEmbedding()}>
            <SaveIcon size={20} /> 分配
          </Button>
        </div>
      </Card>

      <Card class="bg-500">
        <Select
          items={editableEmbeds()}
          value={editId()}
          onChange={(ev) => selectEmbed(ev.value)}
        />
        <TextInput
          label="模型 ID"
          value={newEmbed.model}
          onChange={(ev) => setNewEmbed('model', ev.currentTarget.value)}
        />
        <TextInput
          label="API URL"
          value={newEmbed.url}
          onChange={(ev) => setNewEmbed('url', ev.currentTarget.value)}
        />
        <TextInput
          label="API 密钥"
          value={newEmbed.key}
          onChange={(ev) => setNewEmbed('key', ev.currentTarget.value)}
          type="password"
        />
        <TextInput
          value={newEmbed.inputProp}
          label="输入字段"
          helperMarkdown={'可选：需要时覆盖 `input` 字段名'}
          onChange={(ev) => setNewEmbed('inputProp', ev.currentTarget.value)}
        />
        <Toggle
          label="支持批量"
          value={newEmbed.batch}
          onChange={(ev) => setNewEmbed('batch', ev)}
        />
        <Show when={editId() === ''}>
          <Button onClick={() => createEmbed()}>
            <SaveIcon size={20} /> 创建
          </Button>
        </Show>

        <Show when={editId() !== ''}>
          <Button onClick={() => updateEmbed()}>
            <SaveIcon size={20} /> 更新
          </Button>
        </Show>
      </Card>
    </>
  )
}

const noneSelected = { label: '未选择', value: '' }

// curl -N -X POST 'https://api.featherless.ai/v1/embeddings' \
//   -H 'Authorization: Bearer rc_949b352861e4ada69e864a5dc405ecd4323bda5ce1ee0af2cc1427591a8bca8d' \
//   -H 'Content-Type: application/json' \
//   -d '{
//     "model": "Qwen/Qwen3-Embedding-8B",
//     "input": [
//       "You are a helpful assistant.",
//       "What is the fastest way to get to the airport?"
//     ]
//   }'

// rc_949b352861e4ada69e864a5dc405ecd4323bda5ce1ee0af2cc1427591a8bca8d
