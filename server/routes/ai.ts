import { Router } from 'express'
import { AgentManager } from '../ai/agent-manager.js'
import { ModelRouter } from '../ai/model-router.js'
import type { ConnectorType } from '../ai/agent-manager.js'

const router = Router()

// Initialize agent manager and model router
const agentManager = new AgentManager()
const modelRouter = new ModelRouter()

// Attempt agent initialization (non-blocking)
agentManager.initialize().catch(err => {
  console.warn('Agent initialization failed, using raw completions:', err.message)
})

router.post('/api/ai/chat', async (req, res) => {
  const apiKey = (req.headers['x-mistral-key'] as string) || process.env.MISTRAL_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'MISTRAL_API_KEY not set' })
  }

  const { messages, tools, systemPrompt, dynamicContext } = req.body

  // Route to appropriate model
  const prompt = messages?.[messages.length - 1]?.content ?? ''
  const decision = modelRouter.route(prompt)

  const startTime = Date.now()
  let success = true

  try {
    if (decision.selectedModel === 'student' && decision.modelId !== 'mistral-large-latest') {
      // Student model: raw completions via configurable endpoint
      // Supports Mistral fine-tuned, HuggingFace Inference Endpoints, or local vLLM/Ollama
      const routerConfig = modelRouter.getConfig()
      const studentEndpoint = routerConfig.studentEndpoint
      const studentKey = routerConfig.studentApiKey
        ?? process.env.HF_API_KEY
        ?? apiKey

      const fullMessages = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages

      const response = await fetch(studentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentKey}`,
        },
        body: JSON.stringify({
          model: decision.modelId,
          messages: fullMessages,
          tools,
          tool_choice: 'auto',
        }),
      })

      if (!response.ok) {
        success = false
        const body = await response.text()

        // Fallback to teacher if configured
        if (modelRouter.getConfig().fallbackToTeacher) {
          const fallback = await agentManager.chat(messages, tools, dynamicContext ?? systemPrompt)
          const data = { ...fallback.data, modelId: fallback.modelId, routingDecision: decision }
          return res.json(data)
        }

        return res.status(response.status).json({ error: body })
      }

      const data = await response.json()
      res.json({ ...data, modelId: decision.modelId, routingDecision: decision })
    } else {
      // Teacher model: use agent manager (which handles Agent API vs raw completions)
      const result = await agentManager.chat(messages, tools, dynamicContext ?? systemPrompt)
      res.json({ ...result.data, modelId: result.modelId, routingDecision: decision })
    }
  } catch (err: unknown) {
    success = false
    const message = err instanceof Error ? err.message : String(err)

    // Attempt fallback
    if (modelRouter.getConfig().fallbackToTeacher && decision.selectedModel === 'student') {
      try {
        const fallback = await agentManager.chat(messages, tools, dynamicContext ?? systemPrompt)
        return res.json({ ...fallback.data, modelId: fallback.modelId, routingDecision: decision, fallback: true })
      } catch {
        // fallback also failed
      }
    }

    res.status(500).json({ error: message })
  } finally {
    const latencyMs = Date.now() - startTime
    modelRouter.recordOutcome(decision.selectedModel, success, latencyMs)
  }
})

router.post('/api/ai/agent/create', async (req, res) => {
  const { model, name, connectors } = req.body as {
    model?: string
    name?: string
    connectors?: ConnectorType[]
  }

  agentManager.updateConfig({ model, name, connectors })

  try {
    await agentManager.initialize()
    res.json({ success: true, status: agentManager.getStatus() })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/api/ai/agent/status', (_req, res) => {
  res.json({
    agent: agentManager.getStatus(),
    router: {
      config: modelRouter.getConfig(),
      metrics: modelRouter.getMetrics(),
      studentRate: modelRouter.getStudentRate(),
    },
  })
})

router.post('/api/ai/router/config', (req, res) => {
  modelRouter.updateConfig(req.body)
  res.json({ success: true, config: modelRouter.getConfig() })
})

router.get('/api/ai/scaffolding', (_req, res) => {
  res.json(modelRouter.getScaffoldingMetrics())
})

/**
 * Deploy a fine-tuned model as the student.
 * Accepts a model ID (Mistral ft, HF repo, or local) and optional endpoint/key.
 * Automatically switches routing strategy to progressive handoff.
 */
router.post('/api/ai/deploy-student', (req, res) => {
  const { modelId, endpoint, apiKey, strategy = 'progressive' } = req.body as {
    modelId: string
    endpoint?: string
    apiKey?: string
    strategy?: 'progressive' | 'confidence_based' | 'task_complexity' | 'student_only'
  }

  if (!modelId) {
    return res.status(400).json({ error: 'modelId is required' })
  }

  // Auto-detect endpoint from model ID format
  let resolvedEndpoint = endpoint
  if (!resolvedEndpoint) {
    if (modelId.startsWith('ft:')) {
      // Mistral fine-tuned model
      resolvedEndpoint = 'https://api.mistral.ai/v1/chat/completions'
    } else if (modelId.includes('/') && !modelId.startsWith('http')) {
      // HuggingFace model ID (org/model format) — use HF Inference API
      resolvedEndpoint = `https://api-inference.huggingface.co/models/${modelId}/v1/chat/completions`
    } else {
      // Assume local or already a full URL
      resolvedEndpoint = 'http://localhost:8000/v1/chat/completions'
    }
  }

  modelRouter.updateConfig({
    studentModel: modelId,
    studentEndpoint: resolvedEndpoint,
    studentApiKey: apiKey ?? null,
    strategy,
  })

  res.json({
    success: true,
    deployed: {
      modelId,
      endpoint: resolvedEndpoint,
      strategy,
      hasCustomKey: !!apiKey,
    },
    config: modelRouter.getConfig(),
  })
})

export default router
