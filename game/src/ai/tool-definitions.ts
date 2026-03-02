import { ASSET_IDS } from '../assets/sprites'

export const MISTRAL_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'spawn_entities',
      description:
        'Create one or more entities in the game world. Use for placing characters, platforms, enemies, decorations, items, structures, etc.',
      parameters: {
        type: 'object',
        properties: {
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Display name for the entity' },
                assetId: {
                  type: 'string',
                  enum: ASSET_IDS,
                  description: 'Sprite asset to use',
                },
                x: { type: 'number', description: 'X position in pixels' },
                y: { type: 'number', description: 'Y position in pixels' },
                width: {
                  type: 'number',
                  description: 'Width in pixels (default: sprite default)',
                },
                height: {
                  type: 'number',
                  description: 'Height in pixels (default: sprite default)',
                },
                gravity: {
                  type: 'boolean',
                  description:
                    'Whether affected by gravity (default: false for static objects, true for characters)',
                },
                solid: {
                  type: 'boolean',
                  description:
                    'Whether it collides with other solid entities (default: true)',
                },
                hueShift: {
                  type: 'number',
                  description: 'Color shift 0-360 degrees (default: 0)',
                },
                layerId: {
                  type: 'string',
                  description: 'Layer to place entity on (default: current active layer)',
                },
              },
              required: ['name', 'assetId', 'x', 'y'],
            },
          },
        },
        required: ['entities'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_behavior',
      description:
        'Add a behavior rule to an entity. Triggers: on_collision <name>, on_proximity <distance>, on_interval <ms>, always, on_low_health. Actions: hurt other <dmg>, hurt self <dmg>, move_towards player <speed>, flee_from player <speed>, say <text>, destroy self, teleport <x> <y>, set_physics gravity <true|false>.',
      parameters: {
        type: 'object',
        properties: {
          entityName: {
            type: 'string',
            description: 'Name of the entity to add behavior to',
          },
          trigger: {
            type: 'string',
            description:
              'Trigger condition (e.g., "on_collision player", "on_proximity 100")',
          },
          action: {
            type: 'string',
            description:
              'Action to execute (e.g., "hurt other 10", "move_towards player 80")',
          },
          description: {
            type: 'string',
            description: 'Human-readable description of this behavior',
          },
        },
        required: ['entityName', 'trigger', 'action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_health',
      description:
        'Configure health for an entity. Adds health component if not present.',
      parameters: {
        type: 'object',
        properties: {
          entityName: { type: 'string' },
          hp: { type: 'number', description: 'Current and max HP' },
          respawnDelay: {
            type: 'number',
            description:
              'Milliseconds to wait before respawning (default: 1000)',
          },
        },
        required: ['entityName', 'hp'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_patrol',
      description: 'Make an entity patrol between waypoints.',
      parameters: {
        type: 'object',
        properties: {
          entityName: { type: 'string' },
          waypoints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
              },
              required: ['x', 'y'],
            },
          },
          speed: { type: 'number', description: 'Movement speed (default: 60)' },
          loop: {
            type: 'boolean',
            description: 'Loop or ping-pong (default: false)',
          },
        },
        required: ['entityName', 'waypoints'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'equip_item',
      description: 'Give an entity a weapon, armor, or accessory.',
      parameters: {
        type: 'object',
        properties: {
          entityName: { type: 'string' },
          slot: {
            type: 'string',
            enum: ['weapon', 'armor', 'accessory'],
          },
          item: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              assetId: { type: 'string' },
              kind: {
                type: 'string',
                enum: ['melee', 'ranged', 'shield', 'passive'],
              },
              damage: { type: 'number' },
              range: { type: 'number' },
              cooldown: { type: 'number' },
            },
            required: ['name', 'kind'],
          },
        },
        required: ['entityName', 'slot', 'item'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'move_entity',
      description: 'Move a single entity to a new position.',
      parameters: {
        type: 'object',
        properties: {
          entityName: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
        },
        required: ['entityName', 'x', 'y'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'move_entities',
      description: 'Move multiple entities at once. Use this to rearrange, reorganize, or reposition entities in bulk — much more efficient than calling move_entity many times.',
      parameters: {
        type: 'object',
        properties: {
          moves: {
            type: 'array',
            description: 'Array of entity moves',
            items: {
              type: 'object',
              properties: {
                entityName: { type: 'string', description: 'Name of entity to move' },
                x: { type: 'number', description: 'New X position' },
                y: { type: 'number', description: 'New Y position' },
              },
              required: ['entityName', 'x', 'y'],
            },
          },
        },
        required: ['moves'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_entity',
      description: 'Remove an entity from the world.',
      parameters: {
        type: 'object',
        properties: {
          entityName: { type: 'string' },
        },
        required: ['entityName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'resize_entity',
      description: 'Change the dimensions of an entity.',
      parameters: {
        type: 'object',
        properties: {
          entityName: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
        },
        required: ['entityName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_physics',
      description: 'Configure physics properties of an entity.',
      parameters: {
        type: 'object',
        properties: {
          entityName: { type: 'string' },
          gravity: { type: 'boolean' },
          solid: { type: 'boolean' },
        },
        required: ['entityName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_sprite',
      description: 'Change the sprite, flip, or hue of an entity.',
      parameters: {
        type: 'object',
        properties: {
          entityName: { type: 'string' },
          assetId: { type: 'string', enum: ASSET_IDS },
          flipX: { type: 'boolean' },
          hueShift: { type: 'number', description: '0-360 degrees' },
        },
        required: ['entityName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'link_doors',
      description: 'Link two door entities for teleportation. Doors can be on different layers for cross-layer travel. Player presses UP to teleport.',
      parameters: {
        type: 'object',
        properties: {
          door1Name: { type: 'string' },
          door2Name: { type: 'string' },
          bidirectional: {
            type: 'boolean',
            description:
              'Both doors teleport to each other (default: true)',
          },
        },
        required: ['door1Name', 'door2Name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'clear_world',
      description: 'Remove all entities except the player hero.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_layer',
      description:
        'Move an entity to a different layer, or change an entity\'s layer assignment.',
      parameters: {
        type: 'object',
        properties: {
          entityName: { type: 'string', description: 'Name of entity to move' },
          layerId: { type: 'string', description: 'Target layer ID' },
        },
        required: ['entityName', 'layerId'],
      },
    },
  },
]
