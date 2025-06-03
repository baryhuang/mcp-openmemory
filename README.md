# MCP OpenMemory Server

Gives Claude the ability to remember your conversations and learn from them over time.

## Features

- **Memory Storage**: Save and recall conversation messages
- **Memory Abstracts**: Maintain summarized memory context across conversations
- **Recent History**: Access recent conversations within configurable time windows
- **Local Database**: Uses SQLite for persistent storage without external dependencies

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
      "args": ["/path/to/mcp-openmemory/server.js"],
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

## Development

```bash
npm run dev
```

## License

MIT License
