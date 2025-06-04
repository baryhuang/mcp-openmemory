# MCP OpenMemory Server

[![npm version](https://img.shields.io/npm/v/@peakmojo/mcp-openmemory.svg)](https://www.npmjs.com/package/@peakmojo/mcp-openmemory) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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


## License

MIT License
