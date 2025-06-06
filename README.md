# MCP OpenMemory Server

[![npm version](https://img.shields.io/npm/v/@peakmojo/mcp-openmemory.svg)](https://www.npmjs.com/package/@peakmojo/mcp-openmemory) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blue)](https://modelcontextprotocol.io/)

Gives Claude the ability to remember your conversations and learn from them over time.


https://github.com/user-attachments/assets/aef82b8e-3793-4ebd-b993-ddaef14d52d1


## Features

- **Memory Storage**: Save and recall conversation messages
- **Memory Abstracts**: Maintain summarized memory context across conversations
- **Recent History**: Access recent conversations within configurable time windows
- **Local Database**: Uses SQLite for persistent storage without external dependencies

## ⚠️ Important

**You must configure `MEMORY_DB_PATH` to a persistent location to avoid losing your conversation history when Claude Desktop closes.** If not configured, the database defaults to `./memory.sqlite` in a temporary location that may be cleared when the application restarts.

## Configuration

### Prerequisites

- **Node.js**: Required to run the MCP server. Verify installation with:
  ```bash
  node --version
  ```
  If not installed, download from [nodejs.org](https://nodejs.org)

- **Claude Desktop**: Download the latest version for [macOS or Windows](https://modelcontextprotocol.io/quickstart/user)

### Claude Desktop Integration

#### Configuration File Location

The Claude Desktop configuration file is located at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

To access: Open Claude Desktop → Claude menu → Settings → Developer → Edit Config

#### macOS/Linux
Run directly using npm
```json
{
  "mcpServers": {
    "mcp-openmemory": {
      "command": "npx",
      "args": [
        "@peakmojo/mcp-openmemory@latest"
      ],
      "env": {
        "MEMORY_DB_PATH": "/Users/username/mcp-memory.sqlite"
      }
    }
  }
}
```

#### Windows
Run directly using npm
```json
{
  "mcpServers": {
    "mcp-openmemory": {
      "command": "npx",
      "args": [
        "@peakmojo/mcp-openmemory@latest"
      ],
      "env": {
        "MEMORY_DB_PATH": "C:\\Users\\username\\mcp-memory.sqlite"
      }
    }
  }
}
```

#### Run from source (all platforms)
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["/path/to/your/repo/server.js"],
      "env": {
        "MEMORY_DB_PATH": "/path/to/your/memory.sqlite"
      }
    }
  }
}
```

### Environment Variables

- `MEMORY_DB_PATH`: Path to SQLite database file (default: `./memory.sqlite`)

### Verification

After configuring and restarting Claude Desktop, you should see:

1. **Slider Icon** (🔧) in the bottom left of the input box
2. **Available Tools** when clicking the slider:
   - `save_memory`
   - `recall_memory_abstract` 
   - `update_memory_abstract`
   - `get_recent_memories`

### Troubleshooting  

#### Server Not Showing Up

1. **Restart Claude Desktop** completely
2. **Check JSON syntax** in your configuration file
3. **Verify paths are absolute** (not relative) and exist
4. **Test manual server start**:
   ```bash
   # Test if the server runs correctly
   npx @peakmojo/mcp-openmemory@latest
   ```

#### Check Logs

**Log Locations:**
- **macOS**: `~/Library/Logs/Claude/`
- **Windows**: `%APPDATA%\Claude\logs\`

**View recent logs:**
```bash
# macOS/Linux
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log

# Windows  
type "%APPDATA%\Claude\logs\mcp*.log"
```

#### Common Issues

- **ENOENT errors on Windows**: Add `APPDATA` to your env configuration
- **Tool calls failing**: Check server logs for errors
- **NPM not found**: Install NPM globally with `npm install -g npm`

For detailed troubleshooting, see the [official MCP documentation](https://modelcontextprotocol.io/quickstart/user).

### Security Note

⚠️ **Claude Desktop runs MCP servers with your user account permissions.** Only install servers from trusted sources.

## Available Tools

- **save_memory**: Store individual conversation messages
- **recall_memory_abstract**: Get current memory summary
- **update_memory_abstract**: Update the memory summary  
- **get_recent_memories**: Retrieve recent conversation history

## Usage

The server starts automatically when configured with Claude Desktop. The database will be created automatically on first use.

## Example System Prompt
```
# Memory Usage Guidelines

You should use memory tools thoughtfully to enhance conversation continuity and context retention:

## When to Save Memory
- **save_memory**: Store significant conversation exchanges, important decisions, user preferences, or key context that would be valuable to remember in future conversations
- Focus on information that has lasting relevance rather than temporary details
- Save when users share important personal information, project details, or ongoing work context

## When to Update Memory Abstract  
- **update_memory_abstract**: After processing recent conversations, combine new important information with existing context to create an improved summary
- Update when there are meaningful developments in ongoing projects or relationships
- Consolidate related information to maintain coherent context over time

## When to Recall Memory
- **recall_memory_abstract**: Use at the beginning of conversations to understand previous context, or when you need background information to better assist the user
- **get_recent_memories**: Access when you need specific details from recent exchanges that aren't captured in the abstract
- Recall when the user references previous conversations or when context would significantly improve your assistance

## What Constitutes Critical Information
- User preferences and working styles
- Ongoing projects and their current status  
- Important personal or professional context
- Decisions made and their rationale
- Key relationships or collaborations mentioned
- Technical specifications or requirements for recurring tasks

Use these tools to build continuity and provide more personalized assistance, not as error-prevention mechanisms or intent-guessing systems.
```

## 🔀 Namespacing Memory by Project

You can separate memory per project in two ways:

### 1. Hard Separation (Claude vs Cursor)

Use different `MEMORY_DB_PATH` in each app's config:

- **Claude** (`claude_desktop_config.json`):

```json
"mcpServers": {
  "claude-memory": {
    "command": "npx",
    "args": ["@peakmojo/mcp-openmemory@latest"],
    "env": {
      "MEMORY_DB_PATH": "/Users/you/claude-memory.sqlite"
    }
  }
}
```
- **Cursor** (.cursor/config.json or tool config):
```
"mcpServers": {
  "cursor-memory": {
    "command": "npx",
    "args": ["@peakmojo/mcp-openmemory@latest"],
    "env": {
      "MEMORY_DB_PATH": "/Users/you/cursor-memory.sqlite"
    }
  }
}
```
Each app runs its own instance, storing to its own DB.

### 2. Soft Namespacing via context

When calling memory tools, pass a custom "context":
```
{ "context": "project-x", "message": "Notes from project X." }
```
Use this to segment memory logically within the same database.

🔍 Semantic search is not supported yet. Open a GitHub issue if needed.

## References

- **[Model Context Protocol (MCP) Official Documentation](https://modelcontextprotocol.io/)** - Complete MCP specification and guides
- **[MCP Quickstart for Claude Desktop Users](https://modelcontextprotocol.io/quickstart/user)** - Step-by-step setup guide
- **[MCP Server Development Guide](https://modelcontextprotocol.io/quickstart/server)** - For building custom MCP servers
- **[MCP GitHub Repository](https://github.com/modelcontextprotocol)** - Official MCP implementation and examples
- **[Claude Desktop](https://claude.ai/desktop)** - Download Claude Desktop application
- **[Node.js](https://nodejs.org/)** - Required runtime for MCP servers

## License

MIT License
