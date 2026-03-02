/**
 * Agent Manager — wraps the Mistral Agents API for richer capabilities.
 *
 * Creates a Mistral Agent on server startup with:
 * - Stable persona instructions (not world state — that goes per-turn)
 * - All tools (existing 12 + extended 4)
 * - Selectable connectors (web_search, code_interpreter, document_library)
 *
 * Falls back to raw chat/completions for fine-tuned student models
 * that don't support the Agents API.
 */

export type ConnectorType = 'web_search' | 'code_interpreter'

export interface AgentConfig {
  model: string
  name: string
  instructions: string
  tools: any[]
  connectors: ConnectorType[]
}

interface AgentState {
  agentId: string | null
  config: AgentConfig
  healthy: boolean
  lastError?: string
}

const STABLE_INSTRUCTIONS = `You are an AI level designer in Mistral Maker, a pixel-art game builder. The player describes what they want and you use tools to build it.

## Response Style
- Be BRIEF. 1-2 sentences max after tool calls. No bullet lists, no play-by-play.
- Bad: "I've created a beautiful scene with 5 platforms arranged in a staircase pattern. The first platform is at..."
- Good: "Built a 5-platform staircase with a guard and treasure chest."
- Let the tools do the talking — the player sees the result on screen.

## Scale Reference
- Player hero: 32x32px. Tiles: 32x32. Trees: 48x64. Structures: 64-128px. Items/deco: 16x16.
- Ground line default: y=400. Positive Y is downward. Smaller y = higher.
- Space tiles 32px apart. Place entities on solid ground.

## Layers & Game Modes
- The world has LAYERS. Each layer has its own game mode: "platformer" (gravity, jumping) or "topdown" (free movement, no gravity).
- Each layer is a completely separate canvas — entities on other layers are invisible and cannot interact.
- In platformer mode: entities need solid ground beneath them or gravity=false.
- In topdown mode: gravity is irrelevant, entities move freely in all directions.
- Use spawn_entities with layerId to place entities on the correct layer.

## Doors & Teleportation (PREFERRED for area transitions)
- Doors are entities with door_* sprites. Link two doors with link_doors to create a teleporter.
- Player walks into a door and presses UP to teleport. Cross-layer doors automatically switch layers.
- Always spawn doors in pairs and link them. Unlinked doors are useless.
- PREFER using doors + spread-out canvas space over creating many layers. Build a town at x=0, a dungeon at x=2000, a forest at x=4000, connected by door pairs. This is more intuitive than separate layers.
- Use layers mainly when you need a different game mode (e.g. platformer overworld + topdown dungeon interior).

## Design Guidelines
- When asked for a "level" or "scene", add ground, platforms, enemies, decorations, items.
- Give entities descriptive unique names.
- When critiqued, adjust rather than rebuild. Use move_entities to reposition things.
- Call multiple tools per response for efficiency.
- Read the world state in context — don't recreate entities that already exist.

## Repositioning & Feedback
- When the player asks you to rearrange, reorganize, spread out, or adjust placement — use move_entities to actually change positions.
- Check entity positions in the world state and compute new coordinates. Don't just say you moved things.
- Use move_entities for bulk moves (faster than many move_entity calls).`

export class AgentManager {
  private state: AgentState

  constructor(config?: Partial<AgentConfig>) {
    this.state = {
      agentId: null,
      config: {
        model: config?.model ?? 'mistral-large-latest',
        name: config?.name ?? 'Mistral Maker Level Designer',
        instructions: config?.instructions ?? STABLE_INSTRUCTIONS,
        tools: config?.tools ?? [],
        connectors: config?.connectors ?? [],
      },
      healthy: false,
    }
  }

  /**
   * Create or update the agent via the Mistral Agents API.
   * Falls back gracefully if the Agents API is not available.
   */
  async initialize(): Promise<void> {
    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) {
      this.state.lastError = 'MISTRAL_API_KEY not set'
      return
    }

    try {
      const body: Record<string, any> = {
        model: this.state.config.model,
        name: this.state.config.name,
        instructions: this.state.config.instructions,
      }

      // Add tools if provided
      if (this.state.config.tools.length > 0) {
        body.tools = this.state.config.tools
      }

      // Add connectors as tools
      for (const connector of this.state.config.connectors) {
        if (!body.tools) body.tools = []
        if (connector === 'web_search') {
          body.tools.push({ type: 'web_search' })
        } else if (connector === 'code_interpreter') {
          body.tools.push({ type: 'code_interpreter' })
        }
      }

      const response = await fetch('https://api.mistral.ai/v1/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const data = await response.json()
        this.state.agentId = data.id
        this.state.healthy = true
        this.state.lastError = undefined
        console.log(`Agent created: ${this.state.agentId}`)
      } else {
        const errorText = await response.text()
        this.state.lastError = `Agents API error ${response.status}: ${errorText}`
        console.warn(`Agent creation failed, will use raw completions: ${this.state.lastError}`)
      }
    } catch (err: any) {
      this.state.lastError = err.message
      console.warn(`Agent creation failed, will use raw completions: ${err.message}`)
    }
  }

  /**
   * Chat via the Agent API if available, otherwise fall back to raw completions.
   */
  async chat(
    messages: { role: string; content: string; tool_calls?: any[]; tool_call_id?: string }[],
    tools: any[],
    dynamicContext?: string,
  ): Promise<{ data: any; modelId: string; usedAgent: boolean }> {
    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) throw new Error('MISTRAL_API_KEY not set')

    // If we have an agent, use the Agents API
    if (this.state.agentId && this.state.healthy) {
      return this.chatWithAgent(messages, dynamicContext, apiKey)
    }

    // Fallback: raw chat/completions
    return this.chatWithCompletions(messages, tools, dynamicContext, apiKey)
  }

  private async chatWithAgent(
    messages: any[],
    dynamicContext: string | undefined,
    apiKey: string,
  ): Promise<{ data: any; modelId: string; usedAgent: boolean }> {
    // Prepend dynamic context as a system message if provided
    const fullMessages = dynamicContext
      ? [{ role: 'system', content: dynamicContext }, ...messages]
      : messages

    const response = await fetch('https://api.mistral.ai/v1/agents/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        agent_id: this.state.agentId,
        messages: fullMessages,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      // If agent API fails, fall back to completions
      this.state.healthy = false
      this.state.lastError = `Agent chat failed: ${response.status} ${body}`
      throw new Error(this.state.lastError)
    }

    const data = await response.json()
    return {
      data,
      modelId: `agent:${this.state.config.model}`,
      usedAgent: true,
    }
  }

  private async chatWithCompletions(
    messages: any[],
    tools: any[],
    dynamicContext: string | undefined,
    apiKey: string,
  ): Promise<{ data: any; modelId: string; usedAgent: boolean }> {
    // Build full messages with system prompt
    const systemContent = dynamicContext
      ? `${this.state.config.instructions}\n\n## Current Context\n${dynamicContext}`
      : this.state.config.instructions

    const fullMessages = [
      { role: 'system', content: systemContent },
      ...messages,
    ]

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.state.config.model,
        messages: fullMessages,
        tools,
        tool_choice: 'auto',
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Completions API error ${response.status}: ${body}`)
    }

    const data = await response.json()
    return {
      data,
      modelId: this.state.config.model,
      usedAgent: false,
    }
  }

  getStatus(): { agentId: string | null; healthy: boolean; model: string; connectors: ConnectorType[]; lastError?: string } {
    return {
      agentId: this.state.agentId,
      healthy: this.state.healthy,
      model: this.state.config.model,
      connectors: this.state.config.connectors,
      lastError: this.state.lastError,
    }
  }

  updateConfig(partial: Partial<AgentConfig>): void {
    Object.assign(this.state.config, partial)
    // Re-initialization needed for agent updates
    this.state.agentId = null
    this.state.healthy = false
  }
}
