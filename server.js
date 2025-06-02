#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { DatabaseService } from './database.js';
import { MemoryService } from './memory.js';
import { Logger } from './logger.js';

// Initialize logger
const logger = new Logger('mcp-openmemory');

// Schema definitions for tool arguments
const SaveMemoryArgsSchema = z.object({
  speaker: z.string().describe('Who spoke: agent, user, or system'),
  message: z.string().describe('The message content'),
  context: z.string().optional().describe('Additional context about the conversation'),
});

const RecallMemoryAbstractArgsSchema = z.object({
  force_refresh: z.boolean().optional().describe('Force refresh without using cache'),
});

const UpdateMemoryAbstractArgsSchema = z.object({
  abstract: z.string().describe('Updated memory abstract to save'),
  last_processed_timestamp: z.number().optional().describe('Timestamp of the last processed message (defaults to current time)'),
});

const RecentMemoriesArgsSchema = z.object({
  max_days: z.number().optional().describe('Maximum days to look back (default: 3)'),
  force_refresh: z.boolean().optional().describe('Force refresh without using cache'),
});



// Create the server
const server = new Server(
  {
    name: 'mcp-openmemory',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Initialize database and memory service
let dbService;
let memoryService;

async function initializeServices() {
  try {
    const dbPath = process.env.MEMORY_DB_PATH || './memory.sqlite';
    dbService = new DatabaseService(dbPath);
    await dbService.initialize();
    
    memoryService = new MemoryService(dbService);
    logger.info('Database and memory services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'save_memory',
        description: 'Save individual conversation messages to memory storage. Use this when you want to persist important parts of our current conversation. Call this for each significant message or exchange that should be remembered for future conversations. Typically used during or at the end of conversations to store key information, decisions, or context.',
        inputSchema: {
          type: 'object',
          properties: SaveMemoryArgsSchema.shape,
          required: ['speaker', 'message'],
        },
      },
      {
        name: 'recall_memory_abstract',
        description: 'Retrieve the current memory abstract that summarizes past conversations and context. Use this at the beginning of conversations to understand what has been discussed before, or when you need to check existing memory context. This gives you the processed summary of previous interactions, not raw messages. Call this to "remember" previous conversations with this user.',
        inputSchema: {
          type: 'object',
          properties: RecallMemoryAbstractArgsSchema.shape,
          required: [],
        },
      },
      {
        name: 'update_memory_abstract',
        description: 'Save a new or updated memory abstract after processing recent conversations. Use this when you have reviewed recent messages, combined them with existing memory context, and created an improved summary. The typical workflow is: 1) Get current memory abstract, 2) Get recent memories, 3) Process and combine them, 4) Save the updated abstract here. This maintains the evolving memory summary over time.',
        inputSchema: {
          type: 'object',
          properties: UpdateMemoryAbstractArgsSchema.shape,
          required: ['abstract'],
        },
      },
      {
        name: 'get_recent_memories',
        description: 'Retrieve recent raw conversation messages from the last few days. Use this when you need to see actual conversation history rather than the processed summary. Helpful for creating or updating memory abstracts, or when you need specific details from recent exchanges. This gives you the unprocessed message data to work with.',
        inputSchema: {
          type: 'object',
          properties: RecentMemoriesArgsSchema.shape,
          required: [],
        },
      },

    ],
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error('Arguments are required');
    }

    const { name, arguments: args } = request.params;

    switch (name) {
      case 'save_memory': {
        const validatedArgs = SaveMemoryArgsSchema.parse(args);
        const result = await memoryService.saveMemory(validatedArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'recall_memory_abstract': {
        const validatedArgs = RecallMemoryAbstractArgsSchema.parse(args);
        const result = await memoryService.getLatestMemoryAbstract();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_memory_abstract': {
        const validatedArgs = UpdateMemoryAbstractArgsSchema.parse(args);
        const result = await memoryService.updateMemoryAbstract(
          validatedArgs.abstract,
          validatedArgs.last_processed_timestamp
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_recent_memories': {
        const validatedArgs = RecentMemoriesArgsSchema.parse(args);
        const result = await memoryService.getRecentMemories(
          validatedArgs.max_days || 3,
          validatedArgs.force_refresh
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }



      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error('Error executing tool:', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }, null, 2),
        },
      ],
    };
  }
});

// Resource definitions
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'memory://schema',
        name: 'Database Schema',
        description: 'SQLite database schema for memory storage',
        mimeType: 'application/json',
      },
      {
        uri: 'memory://stats',
        name: 'Memory Statistics',
        description: 'Statistics about stored memories and conversations',
        mimeType: 'application/json',
      },
    ],
  };
});

// Resource reading handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'memory://schema': {
      const schema = await dbService.getSchema();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(schema, null, 2),
          },
        ],
      };
    }

    case 'memory://stats': {
      const stats = await memoryService.getMemoryStats();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// Prompt definitions
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'memory_summary',
        description: 'Generate a summary of stored memories for an agent',
        arguments: [
          {
            name: 'agent_name',
            description: 'Name of the agent',
            required: true,
          },
          {
            name: 'days_back',
            description: 'Number of days to look back (default: 7)',
            required: false,
          },
        ],
      },
    ],
  };
});

// Prompt handler
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'memory_summary': {
      const agentName = args?.agent_name;
      const daysBackArg = args?.days_back;
      const daysBack = typeof daysBackArg === 'number' ? daysBackArg : 7;
      
      if (!agentName) {
        throw new Error('agent_name is required');
      }
      
      const summary = await memoryService.generateMemorySummary(agentName, daysBack);
      
      return {
        description: `Memory summary for agent ${agentName} over the last ${daysBack} days`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: summary,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

async function runServer() {
  try {
    await initializeServices();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('MCP OpenMemory Server running on stdio');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  if (dbService) {
    await dbService.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  if (dbService) {
    await dbService.close();
  }
  process.exit(0);
});

// Start the server
runServer().catch((error) => {
  logger.error('Fatal error in main():', error);
  process.exit(1);
}); 