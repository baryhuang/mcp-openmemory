# MCP OpenMemory Server

Gives Claude the ability to remember your conversations and learn from them over time.

## Features

- **Memory Storage**: Save and recall conversation messages
- **Memory Abstracts**: Maintain summarized memory context across conversations
- **Recent History**: Access recent conversations within configurable time windows
- **Local Database**: Uses SQLite for persistent storage without external dependencies

## ⚠️ Important

**You must configure `MEMORY_DB_PATH` to a persistent location to avoid losing your conversation history when Claude Desktop closes.** If not configured, the database defaults to `./memory.sqlite` in a temporary location that may be cleared when the application restarts.

## Configuration

### Claude Desktop Integration
Run directly using npm
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["@buryhuang/mcp-openmemory"],
      "env": {
        "MEMORY_DB_PATH": "/path/to/your/memory.sqlite"
      }
    }
  }
}
```


Or run from source
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["/path/to/your/repo/server.js"]
      "env": {
        "MEMORY_DB_PATH": "/path/to/your/memory.sqlite"
      }
    }
  }
}
```

### Environment Variables

- `MEMORY_DB_PATH`: Path to SQLite database file (default: `./memory.sqlite`)

## Available Tools

- **save_memory**: Store individual conversation messages
- **recall_memory_abstract**: Get current memory summary
- **update_memory_abstract**: Update the memory summary  
- **get_recent_memories**: Retrieve recent conversation history

## Available Resources

- `memory://schema`: Database schema information
- `memory://stats`: Memory statistics

## Available Prompts

- `memory_summary`: Generate memory summary for an agent

## Usage

The server starts automatically when configured with Claude Desktop. The database will be created automatically on first use.


## License

MIT License
