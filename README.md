# MCP OpenMemory Server

A Model Context Protocol (MCP) server for AI memory management with long-term and short-term memory capabilities.

## Features

- **Long-term Memory**: Store and recall conversation histories and insights
- **Short-term Memory**: Access recent conversations with configurable time windows  
- **Automatic Processing**: Smart memory updates that only process new information
- **User Identification**: Automatic user identification from session identifiers
- **Memory Insights**: Get statistics about stored conversations and memories

## Installation

### From npm

```bash
npm install -g @buryhuang/mcp-openmemory
```

### From source

```bash
git clone https://github.com/buryhuang/mcp-openmemory.git
cd mcp-openmemory
npm install
npm run build
```

## Configuration

### Claude Desktop Integration

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "memory": {
      "command": "memory-mcp",
      "env": {
        "MEMORY_DB_PATH": "/path/to/your/memory.sqlite"
      }
    }
  }
}
```

Or if installed from source:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/mcp-openmemory/index.js"],
      "env": {
        "MEMORY_DB_PATH": "/path/to/your/memory.sqlite"
      }
    }
  }
}
```

### Environment Variables

- `MEMORY_DB_PATH`: Path to SQLite database file (default: `./memory.sqlite`)
- `DEBUG`: Set to `true` for debug logging

## Usage

### Available Tools

#### save_memory
Save a conversation message to memory.

**Parameters:**
- `room_name`: Session or conversation identifier
- `session_id`: Unique session identifier  
- `speaker`: Who spoke ("agent", "user", or "system")
- `message`: The message content
- `timestamp`: Unix timestamp
- `agent_name`: Name of the agent

#### recall_memory
Recall stored memories for an agent and user.

**Parameters:**
- `agent_name`: Name of the agent
- `share_id`: User or session identifier
- `force_refresh`: (optional) Force refresh without using cache

#### get_recent_conversations
Get recent conversations for context.

**Parameters:**
- `agent_name`: Name of the agent
- `share_id`: User or session identifier
- `max_days`: (optional) Days to look back (default: 3)
- `language`: (optional) Language for processing (default: "english")
- `force_refresh`: (optional) Force refresh without using cache

#### get_llm_config
Get LLM configuration for an agent.

**Parameters:**
- `agent_config`: Agent configuration object

### Available Resources

- `memory://schema`: Database schema information
- `memory://stats`: Memory statistics and insights

### Available Prompts

- `memory_summary`: Generate a summary of stored memories
  - `agent_name` (required): Name of the agent
  - `days_back` (optional): Number of days to look back (default: 7)

## Example Usage

```bash
# Run with default settings
memory-mcp

# Run with custom database location
MEMORY_DB_PATH=/Users/username/ai-memory.sqlite memory-mcp

# Run with debug logging
DEBUG=true memory-mcp
```

## Troubleshooting

### Common Issues

1. **Database Permission Errors**: Ensure the directory for `MEMORY_DB_PATH` exists and is writable
2. **MCP Connection Issues**: Verify the path in your Claude Desktop configuration is correct
3. **Memory Not Persisting**: Check that the database file is being created in the expected location

### Debug Logging

Enable debug logging to troubleshoot issues:

```bash
DEBUG=true memory-mcp
```

## Development

```bash
# Development mode
npm run dev

# Watch mode  
npm run watch

# Build
npm run build
```

## License

MIT License

## Support

For issues and questions, please use the [GitHub issue tracker](https://github.com/buryhuang/mcp-openmemory/issues).
