import { Component } from 'solid-js'
import { Card, Pill } from '/web/shared/Card'
import Select from '/web/shared/Select'
import TextInput from '/web/shared/TextInput'
import { Toggle } from '/web/shared/Toggle'
import { ConfigSetters, ConfigState } from '../types'

export const General: Component<{ state: ConfigState; setters: ConfigSetters }> = (props) => {
  const updateSlots = () => {
    try {
      const obj = JSON.parse(props.state.slots || '{}')
      const formatted = JSON.stringify(obj, null, 2)
      props.setters('slots', formatted)
    } catch (ex) {}
  }

  return (
    <>
      <Card bg="bg-500">
        <TextInput
          fieldName="supportEmail"
          label="支持邮箱"
          helperText="填写后会在主导航添加此邮箱链接"
          value={props.state.supportEmail}
          onChange={(ev) => props.setters('supportEmail', ev.currentTarget.value)}
        />

        <Toggle
          fieldName="maintenance"
          label="启用维护模式"
          helperText="注意：如果数据库不可用，此开关不会生效，请改用环境变量。"
          value={props.state.maintenance}
          onChange={(ev) => props.setters('maintenance', ev)}
        />

        <TextInput
          fieldName="maintenanceMessage"
          isMultiline
          label="维护提示"
          helperText="支持 Markdown"
          value={props.state.maintenanceMessage}
          onChange={(ev) => props.setters('maintenanceMessage', ev.currentTarget.value)}
        />

        <TextInput
          fieldName="stripeCustomerPortal"
          label="Stripe 客户门户"
          value={props.state.stripeCustomerPortal}
          onChange={(ev) => props.setters('stripeCustomerPortal', ev.currentTarget.value)}
        />

        <TextInput
          fieldName="lockSeconds"
          type="number"
          label="锁定时长（秒）"
          helperText="用户级锁的最大 TTL，设为 0 可禁用"
          value={props.state.lockSeconds ?? 0}
          onChange={(ev) => props.setters('lockSeconds', +ev.currentTarget.value)}
        />
      </Card>

      <Card bg="bg-500">
        <TextInput
          fieldName="googleClientId"
          label={
            <div class="flex gap-4">
              <div>Google 客户端 ID</div>
              <Toggle fieldName="googleEnabled" value={props.state.googleEnabled} />
            </div>
          }
          helperText="用于登录"
          value={props.state.googleClientId}
          onChange={(ev) => props.setters('googleClientId', ev.currentTarget.value)}
        />

        <TextInput
          fieldName="slots"
          label={
            <div class="flex items-center gap-2">
              Slots 配置{' '}
              <Pill small onClick={updateSlots}>
                格式化
              </Pill>
            </div>
          }
          helperText="必须是 JSON。会与远程 slots 配置合并，并覆盖 slots.txt。"
          value={props.state.slots}
          onChange={(ev) => props.setters('slots', ev.currentTarget.value)}
          isMultiline
        />
      </Card>

      <Card bg="bg-500">
        <Toggle
          fieldName="policiesEnabled"
          label="启用政策条款"
          helperText="显示服务条款和隐私声明"
          disabled
          class="hidden"
          onChange={(ev) => props.setters('policiesEnabled', ev)}
        />

        <TextInput
          fieldName="termsOfService"
          label="服务条款"
          helperText="尚未实现"
          isMultiline
          disabled
          onChange={(ev) => props.setters('termsOfService', ev.currentTarget.value)}
        />
        <TextInput
          fieldName="privacyStatement"
          label="隐私声明"
          helperText="尚未实现"
          isMultiline
          disabled
          onChange={(ev) => props.setters('privacyStatement', ev.currentTarget.value)}
        />
      </Card>

      <Select
        fieldName="apiAccess"
        label="API 访问等级"
        items={[
          { label: '关闭', value: 'off' },
          { label: '所有用户', value: 'users' },
          { label: '订阅用户', value: 'subscribers' },
          { label: '管理员', value: 'admins' },
        ]}
        value={props.state.apiAccess || 'off'}
        onChange={(ev) => props.setters('apiAccess', ev.value as any)}
      />

      <Card bg="bg-500">
        <TextInput
          fieldName="maxGuidanceTokens"
          label="最大 Guidance Token 数"
          helperText="Saga/Guidance 模板可请求的最大 Token 数，设为 0 可禁用。"
          type="number"
          value={props.state.maxGuidanceTokens ?? 1000}
          onChange={(ev) => props.setters('maxGuidanceTokens', +ev.currentTarget.value)}
        />
        <TextInput
          fieldName="maxGuidanceVariables"
          label="最大 Guidance 变量数"
          helperText="Saga/Guidance 模板可请求的最大变量数，设为 0 可禁用。"
          type="number"
          value={props.state.maxGuidanceVariables ?? 15}
          onChange={(ev) => props.setters('maxGuidanceVariables', +ev.currentTarget.value)}
        />
      </Card>
    </>
  )
}
