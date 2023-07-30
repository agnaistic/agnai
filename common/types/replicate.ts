export type ReplicateModelType = 'openassistant' | 'llama' | 'stablelm'

export type ReplicateModel = {
  name: string
  owner: string
  paper_url: string
  run_count: number
  url: string
  visibility: string
  cover_image_url: string
  license_url: string

  latest_version: {
    id: string
    cog_version: string
    created_at: string
    openapi_schema: any
  }

  urls: { get: string; cancel: string }

  default_example?: {
    completed_at: string
    created_at: string
    started_at: string
    error: any
    id: string
    logs: any
    output: string[]
    input: any
    metrics: { predict_time: number }
    status: string
    version: string
    webhook_completed: any
  }
}
