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
  query: z.string().optional().describe('Optional query to filter memories'),
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
        description: 'Save a conversation message to long-term memory',
        inputSchema: {
          type: 'object',
          properties: SaveMemoryArgsSchema.shape,
          required: ['speaker', 'message'],
        },
      },
      {
        name: 'recall_memory_abstract',
        description: 'Recall the latest memory abstract summary from previous conversations',
        inputSchema: {
          type: 'object',
          properties: RecallMemoryAbstractArgsSchema.shape,
          required: [],
        },
      },
      {
        name: 'update_memory_abstract',
        description: 'Save an updated memory abstract to the database. Caller should first get current memory abstract, process it with new messages, then provide the updated abstract.',
        inputSchema: {
          type: 'object',
          properties: UpdateMemoryAbstractArgsSchema.shape,
          required: ['abstract'],
        },
      },
      {
        name: 'get_recent_memories',
        description: 'Get recent memory history',
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