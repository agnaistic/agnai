import { Component } from 'solid-js'
import { Card } from '/web/shared/Card'
import Select from '/web/shared/Select'
import TextInput from '/web/shared/TextInput'
import { adminStore, settingStore } from '/web/store'
import { ConfigSetters, ConfigState } from '../types'

export const Voice: Component<{ state: ConfigState; setters: ConfigSetters }> = (props) => {
  const settings = settingStore((s) => s.config)
  const state = adminStore((s) => ({ config: s.config }))

  return (
    <Card bg="bg-500">
      <Select
        fieldName="ttsAccess"
        label="语音访问等级"
        items={[
          { label: '关闭', value: 'off' },
          { label: '所有用户', value: 'users' },
          { label: '订阅用户', value: 'subscribers' },
          { label: '管理员', value: 'admins' },
        ]}
        value={state.config?.ttsAccess || 'off'}
        onChange={(ev) => props.setters('ttsAccess', ev.value as any)}
      />

      <TextInput
        fieldName="ttsHost"
        label="语音服务地址"
        helperText="包含路径的完整 URL，可包含查询参数"
        value={state.config?.ttsHost}
        classList={{ hidden: !settings.adapters.includes('agnaistic') }}
        onChange={(ev) => props.setters('ttsHost', ev.currentTarget.value)}
      />

      <TextInput
        fieldName="ttsApiKey"
        label="语音 API 密钥"
        value={''}
        classList={{ hidden: !settings.adapters.includes('agnaistic') }}
        onChange={(ev) => props.setters('ttsApiKey', ev.currentTarget.value)}
      />
    </Card>
  )
}
