import { World } from '../ecs/world'
import { ASSET_IDS } from '../assets/sprites'
import { MISTRAL_TOOLS } from './tool-definitions'
import type { PositionComponent, SpriteComponent } from '../ecs/types'

export interface ToolCall {
  id: string
  function: { name: string; arguments: string }
}

export interface MistralResponse {
  toolCalls: ToolCall[]
  textContent: string
  stopReason: string
}

interface ChatMessage {
  role: string
  content: string
  tool_calls?: unknown[]
  tool_call_id?: string
}

export class MistralClient {
  private messages: ChatMessage[] = []

  /** Send a user message, including fresh world state in the system prompt. */
  async send(text: string, world: World): Promise<MistralResponse> {
    this.messages.push({ role: 'user', content: text })
    return this.callApi(world)
  }

  /** Send tool execution results back for the model's follow-up turn. */
  async sendToolResults(
    results: { tool_call_id: string; content: string }[],
  ): Promise<MistralResponse> {
    for (const r of results) {
      this.messages.push({
        role: 'tool',
        content: r.content,
        tool_call_id: r.tool_call_id,
      })
    }
    return this.callApi()
  }

  private async callApi(world?: World): Promise<MistralResponse> {
    const body: {
      messages: ChatMessage[]
      tools: typeof MISTRAL_TOOLS
      systemPrompt?: string
    } = {
      messages: this.messages,
      tools: MISTRAL_TOOLS,
    }
    if (world) {
      body.systemPrompt = this.buildSystemPrompt(world)
    }

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Mistral API error ${res.status}: ${errorText}`)
    }

    const data = await res.json()

    // Handle the Mistral chat completions response format
    const choice = data.choices?.[0]?.message ?? data

    const toolCalls: ToolCall[] = (choice.tool_calls ?? []).map(
      (tc: {
        id: string
        function: { name: string; arguments: string | object }
      }) => ({
        id: tc.id,
        function: {
          name: tc.function.name,
          arguments:
            typeof tc.function.arguments === 'string'
              ? tc.function.arguments
              : JSON.stringify(tc.function.arguments),
        },
      }),
    )

    // Store the assistant's message for conversation continuity
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: choice.content ?? '',
    }
    if (choice.tool_calls?.length) {
      assistantMsg.tool_calls = choice.tool_calls
    }
    this.messages.push(assistantMsg)

    return {
      toolCalls,
      textContent: choice.content ?? '',
      stopReason: data.choices?.[0]?.finish_reason ?? 'stop',
    }
  }

  private buildSystemPrompt(world: World): string {
    const worldDescription = this.describeWorld(world)

    return `You are an AI level designer in Mistral Maker, a pixel-art platformer builder. The player describes what they want in natural language, and you use the available tools to create, modify, and arrange game entities on screen.

## Current World State
${worldDescription}

## Scale Reference
- The player hero is 32x32 pixels.
- Tiles (grass, stone, brick, etc.) are 32x32 each.
- Trees are 48x64. Structures (houses, castles, towers) are 64-128px wide and 64-128px tall.
- Items and decorations are 16x16.
- The ground line in the default scene is at y=400. Entities with gravity will fall until they hit solid ground.
- Positive Y is downward (screen coordinates). To place something above ground, use a smaller y value.

## Available Asset IDs
${ASSET_IDS.join(', ')}

## Guidelines
- Use the tools to create and modify entities. Be creative and generous with details.
- When the player asks for a "level" or "scene", spawn ground tiles, platforms, enemies, decorations, and items to make it feel alive.
- Place entities on solid ground or on platforms. Account for gravity: characters fall if there is no solid surface below them.
- When the player critiques or asks for changes, adjust what is already there rather than rebuilding from scratch.
- After executing tools, provide a brief friendly description of what you created or changed.
- You may call multiple tools in a single response to build complex scenes efficiently.
- When spawning rows of tiles, space them 32px apart (tile size).
- Give every entity a descriptive, unique name.`
  }

  private describeWorld(world: World): string {
    const entities = world.getAllEntities()
    if (entities.length === 0) return 'The world is empty.'

    const lines: string[] = []
    for (const entity of entities) {
      const pos = entity.components.get('position') as
        | PositionComponent
        | undefined
      const sprite = entity.components.get('sprite') as
        | SpriteComponent
        | undefined

      const posStr = pos ? `(${pos.x}, ${pos.y})` : '(no position)'
      const spriteStr = sprite ? sprite.assetId : 'no sprite'

      lines.push(`- "${entity.name}" [${spriteStr}] at ${posStr}`)
    }

    // Summarize if too many entities to avoid bloating the prompt
    if (lines.length > 60) {
      const summary = lines.slice(0, 30)
      summary.push(`... and ${lines.length - 30} more entities`)
      return summary.join('\n')
    }

    return lines.join('\n')
  }
}
