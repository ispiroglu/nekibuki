import { OpenAPIHono } from '@hono/zod-openapi'
import recognitionRoutes from './routes/recognition'
import webhookRoutes from './routes/webhook'
import type { CloudflareBindings } from './types/bindings'

const app = new OpenAPIHono<{ Bindings: CloudflareBindings }>()

// Mount recognition routes
app.route('/', recognitionRoutes)

// Mount webhook routes
app.route('/', webhookRoutes)

// OpenAPI documentation endpoint
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Photo Recognition API',
    description: 'API for uploading photos and recognizing tourist attractions',
    license: {
      name: 'Apache 2.0',
      url: 'http://www.apache.org/licenses/LICENSE-2.0.html',
    },
  },
  tags: [
    {
      name: 'recognition',
      description: 'Photo recognition endpoints',
    },
    {
      name: 'webhook',
      description: 'QStash webhook endpoints',
    },
  ],
})

export default app
