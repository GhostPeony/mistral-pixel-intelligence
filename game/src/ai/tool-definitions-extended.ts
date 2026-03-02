/**
 * Extended tool definitions for the Agent harness.
 * These supplement the base 12 tools with read-only queries and validation.
 */

export const EXTENDED_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'query_world',
      description: 'Read-only query of the current world state. Use to count entities, find entities by type, check for overlaps, or inspect entity properties without modifying anything.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            enum: [
              'count_all',
              'count_by_type',
              'find_by_sprite',
              'find_overlapping',
              'list_names',
              'get_bounds',
            ],
            description: 'The type of query to run',
          },
          filter: {
            type: 'string',
            description: 'Optional filter value (e.g., sprite assetId prefix for find_by_sprite)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'validate_level',
      description: 'Run automated validation checks on the current level. Checks platform reachability, entity bounds, door links, and enemy placement.',
      parameters: {
        type: 'object',
        properties: {
          checks: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['reachability', 'bounds', 'door_links', 'enemy_placement', 'all'],
            },
            description: 'Which validation checks to run',
          },
        },
        required: ['checks'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_inspiration',
      description: 'Search for game design references and inspiration. Returns ideas for level themes, enemy patterns, puzzle mechanics, etc.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'What to search for (e.g., "castle dungeon puzzle ideas", "platformer boss patterns")',
          },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'lookup_sprite_catalog',
      description: 'Look up available sprites by category. Returns sprite IDs, default dimensions, and descriptions.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['heroes', 'enemies', 'bosses', 'npcs', 'tiles', 'decorations', 'items', 'structures', 'all'],
            description: 'Category to browse',
          },
        },
        required: ['category'],
      },
    },
  },
]
