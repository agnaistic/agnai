import { useLocation } from '@solidjs/router'
import { Component, createEffect, onCleanup } from 'solid-js'

const TEXT: Record<string, string> = {
  Manage: '管理后台',
  Configuration: '服务器配置',
  Users: '用户管理',
  Subscriptions: '订阅与模型',
  Announcements: '公告管理',
  Metrics: '指标',
  'Server Configuration': '服务器配置',
  General: '通用',
  Images: '图像',
  Voice: '语音',
  Embeddings: '嵌入',
  Save: '保存',
  Refresh: '刷新',
  'Online Users': '在线用户',
  Versions: '版本',
  'Max Online Users': '最高在线用户',
  'Registered Users': '注册用户',
  Services: '服务',
  'Message All Users': '向所有用户发送消息',
  Send: '发送',
  'Are you sure you wish to send a message to all users?': '确定要向所有用户发送消息吗？',

  'Manage Announcements': '公告管理',
  Create: '创建',
  Update: '更新',
  Hide: '隐藏',
  Unhide: '取消隐藏',
  Deleted: '已删除',
  Hidden: '已隐藏',
  Pending: '待发布',
  Active: '已生效',
  Announcement: '公告',
  Title: '标题',
  Home: '首页',
  Notification: '通知',
  Location: '位置',
  'Appear on the homepage or notifications list': '显示在首页或通知列表',
  'User Level (Threshold)': '用户等级（阈值）',
  'Announce to users with a tier level or greater `All Users = -1` `Subscribed = 0`':
    '向达到指定层级及以上的用户公告：`全部用户 = -1`，`已订阅 = 0`',
  Content: '内容',
  'Hide Announcement': '隐藏公告',
  'Display At': '显示时间',
  '"Display At" is required': '必须填写“显示时间”',
  Now: '现在',
  notify: '通知',
  home: '首页',

  '← Back to Manage': '← 返回管理后台',
  '鈫?Back to Manage': '← 返回管理后台',
  '← Back to Subscriptions': '← 返回订阅与模型',
  '鈫?Back to Subscriptions': '← 返回订阅与模型',
  'Subscription Tier': '订阅层级',
  'No payment required': '无需付款',
  'No Tiers': '没有层级',
  Tiers: '层级',
  Tier: '层级',
  Model: '模型',
  Models: '模型',
  Disabled: '已禁用',
  Enabled: '已启用',
  disabled: '已禁用',
  default: '默认',
  'Are you sure you wish to delete this subscription?': '确定要删除这个订阅吗？',
  None: '无',
  Name: '名称',
  Description: '描述',
  'API Access Capable': '可使用 API 访问',
  'Guidance (V2) Access Capable': '可使用 Guidance（V2）',
  'Image Generation Access': '图像生成访问',
  'Patreon Tier': 'Patreon 层级',
  Preview: '预览',
  'Stripe Product': 'Stripe 产品',
  Level: '等级',
  'Disable Slots': '禁用 Slots',
  'Cannot submit: Product ID required when price ID provided':
    '无法提交：填写价格 ID 时必须提供产品 ID',
  'Cannot submit: Price ID required when product ID provided':
    '无法提交：填写产品 ID 时必须提供价格 ID',
  'This is be rendered using the markdown renderer. HTML is also supported here.':
    '这里会使用 Markdown 渲染器渲染，也支持 HTML。',
  'If enabled, this tier can use API access if the server allows it':
    '启用后，如果服务器允许，此层级可使用 API 访问。',
  'If enabled, this tier can use GuidanceV2 if the server/preset allows it':
    '启用后，如果服务器或预设允许，此层级可使用 GuidanceV2。',
  'If enabled, this tier can use Agnaistic Image Generation':
    '启用后，此层级可使用 Agnaistic 图像生成。',
  'If Patreon is linked, the minimum tier is required':
    '如果已关联 Patreon，则需要满足最低层级。',
  'If disabled, this tier will not be available to users for selection.':
    '禁用后，用户将无法选择此层级。',
  'This tier will prevent slots from rendering': '此层级会阻止 Slots 渲染。',

  'User Management': '用户管理',
  Username: '用户名',
  'Customer ID': '客户 ID',
  Subscribed: '已订阅',
  Search: '搜索',
  Reset: '重置',
  Info: '信息',
  Close: '关闭',
  Impersonate: '模拟登录',
  'Ban User': '封禁用户',
  'Unban User': '解除封禁',
  'User ID': '用户 ID',
  Banned: '已封禁',
  'No reason given': '未填写原因',
  Handle: '昵称',
  Characters: '角色',
  Chats: '聊天',
  'Subscription Details': '订阅详情',
  Gift: '赠送',
  Apply: '应用',
  'Assign Sub': '分配订阅',
  'Stripe Subscription ID': 'Stripe 订阅 ID',
  Assign: '分配',
  'Session IDs': '会话 ID',
  'Subscription Level': '订阅等级',
  Native: '原生',
  Patreon: 'Patreon',
  Manual: '手动',
  'Period Start': '周期开始',
  'Downgrading at': '降级时间',
  'Cancelled at': '取消时间',
  'Cancels at': '将于此时取消',
  'Renews at': '续订时间',
  State: '状态',
  History: '历史',
  Cancel: '取消',
  Ban: '封禁',
  'Ban Reason': '封禁原因',
  'Change Password': '修改密码',
  'Reset Link:': '重置链接：',
  'Generate Link': '生成链接',
  'No subscription ID': '没有订阅 ID',

  'Subscription Model': '订阅模型',
  'Copy subscription': '复制订阅',
  'Create subscription': '创建订阅',
  'Edit subscription': '编辑订阅',
  'You must select an AI service before saving': '保存前必须选择一个 AI 服务',
  'Load Preset': '加载预设',
  'New Subscription': '新订阅',
  'Replace/Supercede': '替换/取代',
  'Name of the model': '模型名称',
  'A short description of your model': '模型的简短描述',
  'API Key': 'API 密钥',
  '(Optional) API Key for your AI service if applicable.':
    '可选：如果 AI 服务需要，请填写 API 密钥。',
  'API Key is set': '已设置 API 密钥',
  'API Key is not set': '未设置 API 密钥',
  'Model Service URL': '模型服务 URL',
  'Agnaistic service only': '仅 Agnaistic 服务',
  'Anything above -1 requires a "subscription". All users by default are -1.':
    '大于 -1 的值都需要“订阅”。所有用户默认都是 -1。',
  'Guidance Capable': '支持 Guidance',
  'Subscription Disabled': '禁用订阅',
  'Disable the use of this subscription': '禁止使用这个订阅',
  'Is Default Subscription': '设为默认订阅',
  'Is chosen as fallback when no subscription is provided with a request':
    '请求未指定订阅时作为备用项',
  'JSON Schema Capable (Structured Responses)': '支持 JSON Schema（结构化响应）',
  'Vision Model': '视觉模型',
  'Allow Guest Usage': '允许访客使用',
  'Typically for default subscriptions. Require users to sign in to use this subscription.':
    '通常用于默认订阅。关闭后需要用户登录才能使用。',
  'Tokenizer Override': '覆盖 Tokenizer',
  'Optional. For use with custom models.': '可选。用于自定义模型。',
  'Replacement ID not set': '未设置替换订阅 ID',
  'Replace Subscription': '替换订阅',
  Replace: '替换',
  'Replacement Subscription': '替换为订阅',
  'The subscription that will supercede the current subscription': '将取代当前订阅的订阅',
  Levels: '层级',
  'Sub Level': '订阅等级',
  Tokens: 'Token 数',
  Context: '上下文',
  Preset: '预设',
  'Select a preset to start editing. If you are currently editing a preset, it won’t be in the list.':
    '选择一个预设开始编辑。当前正在编辑的预设不会出现在列表中。',
  "Select a preset to start editing. If you are currently editing a preset, it won't be in the list.":
    '选择一个预设开始编辑。当前正在编辑的预设不会出现在列表中。',

  'Support Email': '支持邮箱',
  'If provided, a link to this email will be added to the main navigation':
    '填写后会在主导航添加此邮箱链接',
  'Maintenace Mode Enabled': '启用维护模式',
  'Caution: If your database is no available, this flag will not work. Use the environment variable instead.':
    '注意：如果数据库不可用，此开关不会生效，请改用环境变量。',
  'Maintenance Message': '维护提示',
  'Markdown is supported': '支持 Markdown',
  'Stripe Customer Portal': 'Stripe 客户门户',
  'Lock Duration (seconds)': '锁定时长（秒）',
  'Maximum TTL of user-level lock - Set to zero (0) to disable':
    '用户级锁的最大 TTL，设为 0 可禁用',
  'Google Client ID': 'Google 客户端 ID',
  'Used for Sign In': '用于登录',
  'Slots Configuration': 'Slots 配置',
  Format: '格式化',
  'Must be JSON. Merged with remote slots config -- This config overrides slots.txt':
    '必须是 JSON。会与远程 slots 配置合并，并覆盖 slots.txt。',
  'Enable Policies': '启用政策条款',
  'Display TOS and Privacy Statements': '显示服务条款和隐私声明',
  'Terms of Service': '服务条款',
  'Not yet implemented': '尚未实现',
  PrivacyStatement: '隐私声明',
  'API Access Level': 'API 访问等级',
  Off: '关闭',
  'All Users': '所有用户',
  Subscribers: '订阅用户',
  Adminstrators: '管理员',
  'Max Guidance Tokens': '最大 Guidance Token 数',
  'Max number of tokens a saga/guidance template can reques. Set to 0 to disable.':
    'Saga/Guidance 模板可请求的最大 Token 数，设为 0 可禁用。',
  'Max Guidance Variables': '最大 Guidance 变量数',
  'Max number of variables a saga/guidance template can request. Set to 0 to disable.':
    'Saga/Guidance 模板可请求的最大变量数，设为 0 可禁用。',

  Unset: '未设置',
  'Images Host (A1111 Compatible)': '图像服务地址（兼容 A1111）',
  'Images LoRA URL': '图像 LoRA URL',
  'Default Image Model': '默认图像模型',
  'Image Models': '图像模型',
  Add: '添加',
  'Add Model': '添加模型',
  URL: 'URL',
  'LoRA Support': '支持 LoRA',
  Host: '主机',
  Override: '覆盖',
  Prefix: '前缀',
  Suffix: '后缀',
  Negative: '负面提示',
  Steps: '步数',
  Init: '初始',
  Max: '最大',
  Width: '宽度',
  Height: '高度',
  'Clip Skip': 'Clip Skip',
  'Model Description...': '模型描述...',
  'Model Name...': '模型名称...',
  'Override...': '覆盖...',

  'Embeddings Access Level': '嵌入访问等级',
  All: '全部',
  Admins: '管理员',
  'Selected Embedding': '当前嵌入',
  'New Embedding': '新建嵌入',
  'Model ID': '模型 ID',
  'API URL': 'API URL',
  'Input Property': '输入字段',
  'Optional: Override for `input` property if needed': '可选：需要时覆盖 `input` 字段名',
  'Batch Supported': '支持批量',
  'None selected': '未选择',
  'Missing required fields to create a new embedding':
    '缺少创建新嵌入所需的字段',
  'Cannot update embedding until the newly created embedding ID is available':
    '新建嵌入 ID 可用后才能更新嵌入',
  'Missing required fields (url, key, model)': '缺少必填字段（url、key、model）',
  'Cannot update embedding: Has no ID': '无法更新嵌入：没有 ID',

  'Voice Access Level': '语音访问等级',
  'Voice Host': '语音服务地址',
  'Full URL with Path - Include any query parameters':
    '包含路径的完整 URL，可包含查询参数',
  'Voice API Key': '语音 API 密钥',

  'Preset Mode': '预设模式',
  'Toggle between using "essential options" and all available controls.':
    '在“必要选项”和全部控制项之间切换。',
  Advanced: '高级',
  Simple: '简单',
  'Response Length': '回复长度',
  "Maximum length of the response. Measured in 'tokens'": '回复的最大长度，以 Token 计。',
  'Context Size': '上下文大小',
  'Use Max If Known:': '已知时使用最大值：',
  On: '开',
  'The amount of infomation sent to the model to generate a response.':
    '发送给模型用于生成回复的信息量。',
  'Check your AI service for the maximum context size.':
    '请查看你的 AI 服务支持的最大上下文。',
  'Reasoning Tags': '推理标签',
  'For collapsing reasoning sections in the UI:': '用于在界面中折叠推理段落：',
  Start: '开始',
  End: '结束',
  'System Prompt': '系统提示词',
  'The task the AI is performing. Leave blank if uncertain.':
    'AI 要执行的任务。不确定时可留空。',
  'Jailbreak (UJB)': '越狱提示词（UJB）',
  'Jinja Template': 'Jinja 模板',
  'Prompt Format': '提示词格式',
  Temperature: '温度',
  'Use Local Requests': '使用本地请求',
  'When enabled your browser will make requests instead of Agnaistic. **NOTE**: Your chat will not support multiplayer.':
    '启用后由浏览器直接发起请求，而不是由 Agnaistic 转发。**注意**：聊天将不支持多人模式。',
  'Disable Auto-URL': '禁用自动 URL 后缀',
  'No paths will be added to your URL.': '不会向你的 URL 自动追加路径。',
  'Swipes Per Generation': '每次生成的候选回复数',
  'Number of responses (in swipes) that should generate.': '每次生成的回复数量。',
  'Min P': 'Min P',
  'Stream Response': '流式响应',
  'Stream the response as it is generated': '边生成边返回响应',
  'Exclude Name Stops': '排除名称停止词',
  'Disables automatically adding character names to stopping strings':
    '禁用自动把角色名加入停止字符串',
  'Stopping Strings': '停止字符串',
  'Message Parsers': '消息解析器',
  'Phrase Bias': '短语偏置',
  'Used to discard tokens with the probability under a threshold (min_p) in the sampling process. Higher values will make text more predictable. (Put this value on 0 to disable its effect)':
    '在采样过程中丢弃概率低于阈值（min_p）的 Token。数值越高，文本越可预测。设为 0 可禁用。',

  Prompt: '提示词',
  Memory: '记忆',
  Samplers: '采样器',
  Toggles: '开关',
  Settings: '设置',
  'Use Advanced Prompting': '使用高级提示词',
  Basic: '基础',
  Reasoning: '推理',
  'Reasoning Effort': '推理强度',
  'Typically the amount of your response length to use for reasoning':
    '通常表示回复长度中用于推理的比例',
  'Low (20%)': '低（20%）',
  'Medium (50%)': '中（50%）',
  'High (80%)': '高（80%）',
  Custom: '自定义',
  'Exclude Reasoning Tokens': '排除推理 Token',
  'Append name to prompt instructions': '在提示词指令中追加名称',
  'Bot Response Prefilling': '机器人回复预填',
  'Override Character System Prompt': '覆盖角色系统提示词',
  'Override Character Jailbreak': '覆盖角色越狱提示词',
  Disabled: '已禁用',
  'Single Request': '单次请求',
  'Separate Request': '单独请求',
  'Source: Chat Preset': '来源：聊天预设',
  'Source: Character': '来源：角色',
  'Source: JSON Preset': '来源：JSON 预设',
  'Standard Request': '标准请求',
  ': Has the model output the reasoning and response in a single request.':
    '：让模型在同一次请求中输出推理和回复。',
  'Separate Request': '单独请求',
  ': Sends a separate request for reasoning before generating the response.':
    '：生成回复前单独发送一次推理请求。',
  '**Advanced**: Have complete control over the prompt. No \'missing\' placeholders will be inserted.':
    '**高级**：完全控制提示词。不会插入“缺失”的占位符。',
  ': Have complete control over the prompt. No \'missing\' placeholders will be inserted.':
    '：完全控制提示词。不会插入“缺失”的占位符。',
  'Append name of replying character to very end of the prompt':
    '把回复角色名称追加到提示词末尾',
  'Very well, here is {{char}}\'s response without considering ethics:':
    '好的，下面是 {{char}} 不考虑伦理限制的回复：',
  "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Write at least 1 paragraph, up to 4. Always stay in character and avoid repetition.":
    '在 {{char}} 和 {{user}} 的虚构聊天中写出 {{char}} 的下一条回复。只写 1 条回复，使用网络 RP 风格，动作使用斜体，不使用引号。使用 Markdown。积极、富有创造力，并推动剧情和对话向前发展。至少写 1 段，最多 4 段。始终保持角色身份，避免重复。',
  'Uncensored Models': '未审查模型',
  ': Typically stylistic instructions. E.g. "Respond succinctly':
    '：通常用于风格指令。例如：“简洁回复',
  'Censored Models': '受审查模型',
  ": Instructions to 'jailbreak' from filtering.": '：用于从过滤中“越狱”的指令。',
  'Large jailbreak prompts can cause repetition. Use this prompt only if needed.':
    '过长的越狱提示词可能导致重复。仅在需要时使用。',
  'Respond succinctly using slang': '使用俚语简洁回复',
  'For overriding third-party chat completion templates. Only sent when **Enabled**.':
    '用于覆盖第三方聊天补全模板。仅在启用时发送。',
  'Formatting to use if using "Universal Tags" in your prompt template':
    '在提示词模板中使用“通用标签”时采用的格式',
  'Creativity: Randomness of sampling. High values can increase creativity, but may make text less sensible. Lower values will make text more predictable.':
    '创造性：采样随机性。较高值可提高创造性，但可能让文本不够合理；较低值会让文本更可预测。',

  'Dynamic Temperature': '动态温度',
  Range: '范围',
  Exponent: '指数',
  'XTC Sampling': 'XTC 采样',
  Threshold: '阈值',
  Probability: '概率',
  'DRY Sampling': 'DRY 采样',
  Reference: '参考',
  Multiplier: '倍数',
  Base: '基数',
  'Allowed Length': '允许长度',
  'Sequence Breakers': '序列中断词',
  'Words and phrases that can be repeated. E.g: Chararacter nicknames':
    '允许重复的词语和短语，例如角色昵称。',
  'Smoothing Factor': '平滑因子',
  'Activates Quadratic Sampling. Applies an S-curve to logits, penalizing low-probability tokens and smoothing out high-probability tokens. Allows model creativity at lower temperatures. (Put this value on 0 to disable its effect)':
    '启用二次采样。对 logits 应用 S 曲线，惩罚低概率 Token 并平滑高概率 Token，使模型在较低温度下也能保持创造性。设为 0 可禁用。',
  'Smoothing Curve': '平滑曲线',
  'The smoothing curve to use for Cubic Sampling. (Put this value on 1 to disable its effect)':
    '三次采样使用的平滑曲线。设为 1 可禁用。',
  'CFG Scale': 'CFG Scale',
  'Top P': 'Top P',
  'Used to discard unlikely text in the sampling process. Lower values will make text more predictable but can become repetitious. (Put this value on 1 to disable its effect)':
    '在采样过程中丢弃不太可能的文本。较低值会让文本更可预测，但可能变得重复。设为 1 可禁用。',
  'Top K': 'Top K',
  'Alternative sampling method, can be combined with top_p. The number of highest probability vocabulary tokens to keep for top-k-filtering. (Put this value on 0 to disable its effect)':
    '另一种采样方法，可与 top_p 组合。表示 top-k 过滤中保留的最高概率词表 Token 数。设为 0 可禁用。',
  'Top A': 'Top A',
  'Increases the consistency of the output by removing unlikely tokens based on the highest token probability. Exclude all tokens with p < (top_a * highest_p^2) (Put this value on 0 to disable its effect)':
    '根据最高 Token 概率移除不太可能的 Token，提高输出一致性。排除所有 p < (top_a * highest_p^2) 的 Token。设为 0 可禁用。',
  'Mirostat Tau': 'Mirostat Tau',
  'Mirostat Learning Rate': 'Mirostat 学习率',
  'Mirostat Learning Rate (ETA)': 'Mirostat 学习率（ETA）',
  '*Enable Mirotstat in the Toggles section* Mirostat aims to keep the text at a fixed complexity set by tau.':
    '*请在“开关”区域启用 Mirostat* Mirostat 会尽量让文本保持由 tau 设定的固定复杂度。',
  'Mirostat aims to keep the text at a fixed complexity set by tau.':
    'Mirostat 会尽量让文本保持由 tau 设定的固定复杂度。',
  'Tail Free Sampling': 'Tail Free 采样',
  'Increases the consistency of the output by working from the bottom and trimming the lowest probability tokens. (Put this value on 1 to disable its effect)':
    '从低概率端裁剪最低概率 Token，提高输出一致性。设为 1 可禁用。',
  'Typical P': 'Typical P',
  'Selects tokens according to the expected amount of information they contribute. Set this setting to 1 to disable its effect.':
    '根据 Token 预计贡献的信息量选择 Token。设为 1 可禁用。',
  'Repetition Penalty': '重复惩罚',
  'Used to penalize words that were already generated or belong to the context (Going over 1.2 breaks 6B models. Set to 1.0 to disable).':
    '用于惩罚已经生成或属于上下文的词语（超过 1.2 可能破坏 6B 模型效果，设为 1.0 可禁用）。',
  'Repetition Penalty Range': '重复惩罚范围',
  'How many tokens will be considered repeated if they appear in the next output.':
    '如果出现在下一次输出中，会被视为重复的 Token 数量。',
  'Repetition Penalty Slope': '重复惩罚斜率',
  "Affects the ramping of the penalty's harshness, starting from the final token. (Set to 0.0 to disable)":
    '影响惩罚强度从最终 Token 开始递增的坡度。设为 0.0 可禁用。',
  'ETA Cutoff': 'ETA 截断',
  'Epsilon Cutoff': 'Epsilon 截断',
  'In units of 1e-4; a reasonable value is 3. This sets a probability floor below which tokens are excluded from being sampled.':
    '单位为 1e-4；合理值通常为 3。设置概率下限，低于该值的 Token 会被排除在采样之外。',
  'Frequency Penalty': '频率惩罚',
  "Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim. (Set to 0.0 to disable)":
    '正值会根据新 Token 在当前文本中已有的频率进行惩罚，降低模型逐字重复同一行的可能性。设为 0.0 可禁用。',
  'Presence Penalty': '存在惩罚',
  "Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics. (Set to 0.0 to disable)":
    '正值会根据新 Token 是否已出现在当前文本中进行惩罚，提高模型谈论新主题的可能性。设为 0.0 可禁用。',
  'Encoder Repetition Penalty': '编码器重复惩罚',
  'Encoder Repetion Penalty': '编码器重复惩罚',
  "Also known as the 'Hallucinations filter'. Used to penalize tokens that are *not* in the prior text. Higher value = more likely to stay in context, lower value = more likely to diverge":
    '也称为“幻觉过滤器”。用于惩罚不在先前文本中的 Token。值越高越可能保持上下文，值越低越可能发散。',
  'Penalty Alpha': '惩罚 Alpha',
  'The values balance the model confidence and the degeneration penalty in contrastive search decoding':
    '该值用于在对比搜索解码中平衡模型置信度和退化惩罚。',
  'Number of Beams': 'Beam 数量',
  'Number of beams for beam search. 1 means no beam search.':
    'Beam Search 的 beam 数量。1 表示不使用 Beam Search。',
  'Exclude Top Choices': '排除最高概率选项',

  'Skip Chat Role Merges': '跳过聊天角色合并',
  'Chat completions: When enabled, do not collapse repeated roles into a single message':
    '聊天补全：启用后，不会把重复角色合并为单条消息。',
  'Ensure Last Role is User': '确保最后一条角色为用户',
  'Chat completions: When enabled, the `{{post}}` amble will be sent as a USER role, instead of ASSISTANT.':
    '聊天补全：启用后，`{{post}}` 附加内容会以 USER 角色发送，而不是 ASSISTANT。',
  'CFG Opposing Prompt': 'CFG 反向提示词',
  'Phrase Repetition Penalty': '短语重复惩罚',
  'Very Aggressive': '非常强',
  Aggressive: '强',
  Light: '轻',
  'Very Light': '非常轻',
  'Temperature Last': '最后应用温度',
  'When using Min P, enabling this will make temperature the last sampler to be applied':
    '使用 Min P 时，启用后会让温度成为最后应用的采样器。',
  'Use Mirostat': '使用 Mirostat',
  'Token Healing': 'Token 修复',
  "Backs up the generation process by one token then constrains the output's first token to equal the last token of your prompt.":
    '将生成过程回退一个 Token，并限制输出的第一个 Token 等于提示词的最后一个 Token。',
  'Add BOS Token': '添加 BOS Token',
  'Add begining of sequence token to the start of prompt. Disabling makes the replies more creative.':
    '在提示词开头添加序列起始 Token。禁用后回复可能更有创造性。',
  'Ban EOS Token': '禁用 EOS Token',
  'Ban the end of sequence token. This forces the model to never end the generation prematurely.':
    '禁用序列结束 Token，强制模型不要过早结束生成。',
  'Skip Special Tokens': '跳过特殊 Token',
  'Some specific models need this unset.': '某些特定模型需要关闭此项。',
  'DO Sample': '执行采样',
  'If doing contrastive search, disable this.': '如果使用对比搜索，请关闭此项。',
  'Early Stopping': '提前停止',
  'Controls the stopping condition for beam-based methods, like beam-search.':
    '控制基于 beam 的方法（如 Beam Search）的停止条件。',
  'Sampler Order': '采样器顺序',

  'Memory: Context Limit': '记忆：上下文预算',
  'The maximum context budget (in tokens) for the memory book.':
    '记忆书可使用的最大上下文预算（Token）。',
  'Memory: Long-term Memory Context Budget': '记忆：长期记忆上下文预算',
  'If available: The maximum context budget (in tokens) for long-term memory.':
    '如果可用：长期记忆可使用的最大上下文预算（Token）。',
  'Memory: Embedding Context Budget': '记忆：嵌入上下文预算',
  'If available: The maximum context budget (in tokens) for document embeddings.':
    '如果可用：文档嵌入可使用的最大上下文预算（Token）。',
  'Memory: Chat History Depth': '记忆：聊天历史深度',
  'Number of messages to scan in chat history to scan for memory book keywords.':
    '在聊天历史中扫描记忆书关键词时检查的消息数量。',

  'Select a Model': '选择模型',
  'Manual Model ID': '手动模型 ID',
  Confirm: '确认',
  'Model - None selected': '模型 - 未选择',
  'Model - None Selected': '模型 - 未选择',
  'Use service default': '使用服务默认值',
  'Advanced: Use a custom NovelAI model': '高级：使用自定义 NovelAI 模型',
  'NovelAI Model Override': '覆盖 NovelAI 模型',
  Default: '默认',
  In: '输入',
  Out: '输出',
  'Filter: Model Size': '筛选：模型大小',
  'Model Classes': '模型类别',
  'Min CTX (K)': '最小上下文（K）',
  'Min CTX (B)': '最小上下文（B）',
  'Max Params (B)': '最大参数量（B）',
  'Select Model(s)': '选择模型',
  'Select Horde Models': '选择 Horde 模型',
  'Select Worker(s)': '选择 Worker',
  'Models selected:': '已选择模型：',
  'De-select All': '全部取消选择',
  'Model changed': '模型已更改',
  'Refresh models': '刷新模型',
  'E.g. Mythomax': '例如：Mythomax',
  'E.g. LLama 3 8B: Basic but uncensored': '例如：Llama 3 8B：基础但未审查',
  'E.g. LLama 3.1 8B fine-tune': '例如：Llama 3.1 8B 微调版',
  'Preset created': '预设已创建',
  'Model updated': '模型已更新',
  'Subscribe for higher quality models': '订阅以使用更高质量的模型',
  'Available Models': '可用模型',
  'Image Models': '图像模型',
}

const NORMALIZED_TEXT: Record<string, string> = Object.fromEntries(
  Object.entries(TEXT).map(([key, value]) => [normalize(key), value])
)

const TEXT_ATTRIBUTES = ['aria-label', 'placeholder', 'title'] as const

const DYNAMIC_TEXT: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^(.+) Settings$/, (match) => `${translate(match[1])} 设置`],
  [/^Created:\s*(.+)$/, (match) => `创建时间：${match[1]}`],
  [/^(.+)\s+ago$/, (match) => `${match[1]} 前`],
  [/^Tier\s+(.+)$/, (match) => `层级 ${match[1]}`],
  [/^tier\s+#(.+)$/, (match) => `层级 #${match[1]}`],
  [/^ID:\s*New Subscription$/, () => 'ID：新订阅'],
  [/^ID:\s*(.+)$/, (match) => `ID：${match[1]}`],
  [/^Session:\s*(.+)$/, (match) => `会话：${match[1]}`],
  [/^Model -\s*(.+)$/, (match) => `模型 - ${translate(match[1])}`],
  [/^Copy subscription\s+(.+)$/, (match) => `复制订阅 ${match[1]}`],
  [/^Edit subscription\s+(.+)$/, (match) => `编辑订阅 ${match[1]}`],
  [/^(\d+)\s+Model\(s\)\s+Selected$/, (match) => `已选择 ${match[1]} 个模型`],
  [/^Custom\s+\((.+)\)$/, (match) => `自定义（${match[1]}）`],
  [/^Cannot submit: Product "(.+)" not found$/, (match) => `无法提交：找不到产品“${match[1]}”`],
  [
    /^Cannot submit: Product "(.+)" does not have a price$/,
    (match) => `无法提交：产品“${match[1]}”没有价格`,
  ],
  [/^Cannot submit: Price "(.+)" not found$/, (match) => `无法提交：找不到价格“${match[1]}”`],
  [/^Requires\s+(.+)$/, (match) => `需要 ${match[1]}`],
]

const AdminChineseLocalizer: Component = () => {
  const location = useLocation()
  let observer: MutationObserver | undefined
  let pending = false

  const schedule = (root: Node = document.body) => {
    if (pending) return
    pending = true
    setTimeout(() => {
      pending = false
      localize(root)
      localizeDocumentTitle()
    }, 0)
  }

  createEffect(() => {
    observer?.disconnect()
    observer = undefined

    if (!location.pathname.startsWith('/admin')) return

    schedule()
    setTimeout(() => schedule(), 80)

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
              const root = node.nodeType === Node.TEXT_NODE ? node.parentNode || document.body : node
              schedule(root as Node)
              return
            }
          }
        }

        if (mutation.type === 'characterData' || mutation.type === 'attributes') {
          schedule((mutation.target.parentNode || document.body) as Node)
          return
        }
      }
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [...TEXT_ATTRIBUTES],
      characterData: true,
      childList: true,
      subtree: true,
    })
  })

  onCleanup(() => observer?.disconnect())

  return null
}

function localize(root: Node) {
  const target = root.nodeType === Node.DOCUMENT_NODE ? document.body : root

  if (target.nodeType === Node.TEXT_NODE) {
    localizeTextNode(target as Text)
    return
  }

  if (target.nodeType === Node.ELEMENT_NODE) {
    localizeElement(target as Element)
  }

  const textWalker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT)
  let node = textWalker.nextNode()
  while (node) {
    localizeTextNode(node as Text)
    node = textWalker.nextNode()
  }

  const elementWalker = document.createTreeWalker(target, NodeFilter.SHOW_ELEMENT)
  node = elementWalker.nextNode()
  while (node) {
    localizeElement(node as Element)
    node = elementWalker.nextNode()
  }
}

function localizeElement(element: Element) {
  if (shouldSkipElement(element)) return

  for (const attr of TEXT_ATTRIBUTES) {
    const value = element.getAttribute(attr)
    if (!value) continue

    const translated = preserveSpacing(value, translate(value))
    if (translated !== value) {
      element.setAttribute(attr, translated)
    }
  }
}

function localizeTextNode(node: Text) {
  if (!node.nodeValue || shouldSkipText(node)) return

  const translated = preserveSpacing(node.nodeValue, translate(node.nodeValue))
  if (translated !== node.nodeValue) {
    node.nodeValue = translated
  }
}

function translate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return value

  const normalized = normalize(trimmed)
  const exact = TEXT[trimmed] || NORMALIZED_TEXT[normalized]
  if (exact) return exact

  for (const [pattern, replace] of DYNAMIC_TEXT) {
    const match = normalized.match(pattern)
    if (match) return replace(match)
  }

  return trimmed
}

function localizeDocumentTitle() {
  const suffix = ' - Agnaistic'

  if (document.title.endsWith(suffix)) {
    const title = document.title.slice(0, -suffix.length)
    const translated = translate(title)
    if (translated !== title) {
      document.title = `${translated}${suffix}`
    }
    return
  }

  const translated = translate(document.title)
  if (translated !== document.title) {
    document.title = translated
  }
}

function preserveSpacing(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? ''
  const trailing = original.match(/\s*$/)?.[0] ?? ''
  return `${leading}${translated}${trailing}`
}

function normalize(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function shouldSkipText(node: Text) {
  const parent = node.parentElement
  if (!parent) return true
  return shouldSkipElement(parent)
}

function shouldSkipElement(element: Element) {
  return !!element.closest(
    'script, style, textarea, input, code, pre, kbd, samp, [data-no-localize]'
  )
}

export default AdminChineseLocalizer
