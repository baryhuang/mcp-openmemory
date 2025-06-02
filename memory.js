import { Logger } from './logger.js';

export class MemoryService {
  constructor(dbService) {
    this.dbService = dbService;
    this.logger = new Logger('MemoryService');
  }

  async saveMemory(request) {
    try {
      this.logger.info(`Saving memory for speaker ${request.speaker}`);
      
      const memoryRecord = {
        speaker: request.speaker,
        message: request.message,
        timestamp: request.timestamp || Math.floor(Date.now() / 1000),
      };

      return await this.dbService.saveMemory(memoryRecord);
    } catch (error) {
      this.logger.error('Error saving memory:', error);
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  async recallLongtermMemory(forceRefresh = false) {
    try {
      this.logger.info(`Recalling memory abstract, force_refresh=${forceRefresh}`);
      
      // Get the latest memory abstract (skip if force_refresh is True)
      let latestAbstract = null;
      if (!forceRefresh) {
        latestAbstract = await this.dbService.getLatestMemoryAbstract();
      }
      
      if (latestAbstract && !forceRefresh) {
        // We have a previous abstract, do incremental processing
        this.logger.info('Found existing memory abstract, doing incremental processing');
        
        const lastProcessedTimestamp = latestAbstract.last_processed_timestamp || 0;
        const previousAbstract = latestAbstract.abstract_content || '';
        
        // Get new messages since the last processed timestamp
        const newMessages = await this.dbService.getMessagesAfterTimestamp(
          lastProcessedTimestamp
        );
        
        if (newMessages.length > 0) {
          this.logger.info(`Found ${newMessages.length} new messages to process`);
          
          // Format new messages for processing
          const newMessagesText = [];
          let latestTimestamp = lastProcessedTimestamp;
          
          for (const message of newMessages) {
            const speaker = message.speaker || 'unknown';
            const content = message.message || '';
            const timestamp = message.timestamp;
            
            try {
              const date = new Date(timestamp * 1000);
              let dateStr = date.toISOString().replace('T', ' ').substring(0, 19);
              if (message.sequence !== undefined) {
                dateStr = `${dateStr}_${message.sequence}`;
              }
              latestTimestamp = Math.max(latestTimestamp, timestamp);
              
              newMessagesText.push(`[${dateStr}] ${this.capitalize(speaker)}: ${content}`);
            } catch (error) {
              newMessagesText.push(`[Unknown time] ${this.capitalize(speaker)}: ${content}`);
            }
          }
          
          // For now, return the combined abstract without LLM processing
          // In a real implementation, you would call an LLM API here
          const combinedAbstract = this.combineAbstracts(previousAbstract, newMessagesText);
          
          // Save the new abstract
          await this.dbService.saveMemoryAbstract(
            combinedAbstract, 
            latestTimestamp
          );
          
          return { memories: combinedAbstract };
        } else {
          this.logger.info('No new messages to process, returning existing abstract');
          return { memories: previousAbstract };
        }
      } else {
        // No previous abstract or force refresh, process all messages
        this.logger.info('No existing abstract or force refresh, processing all messages');
        
        const allMessages = await this.dbService.getMemoriesByDateRange(14);
        
        if (allMessages.length === 0) {
          this.logger.info('No messages found');
          return { memories: 'No previous conversations found.' };
        }
        
        // Format all messages
        const allMessagesText = [];
        let latestTimestamp = 0;
        
        for (const message of allMessages) {
          const speaker = message.speaker || 'unknown';
          const content = message.message || '';
          const timestamp = message.timestamp;
          
          try {
            const date = new Date(timestamp * 1000);
            let dateStr = date.toISOString().replace('T', ' ').substring(0, 19);
            if (message.sequence !== undefined) {
              dateStr = `${dateStr}_${message.sequence}`;
            }
            latestTimestamp = Math.max(latestTimestamp, timestamp);
            
            allMessagesText.push(`[${dateStr}] ${this.capitalize(speaker)}: ${content}`);
          } catch (error) {
            allMessagesText.push(`[Unknown time] ${this.capitalize(speaker)}: ${content}`);
          }
        }
        
        // For now, create a simple summary without LLM processing
        const newAbstract = this.createSimpleSummary(allMessagesText);
        
        // Save the new abstract
        await this.dbService.saveMemoryAbstract(
          newAbstract, 
          latestTimestamp
        );
        
        return { memories: newAbstract };
      }
    } catch (error) {
      this.logger.error('Error recalling memory abstract:', error);
      return { memories: `Error recalling memories: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async getRecentMemories(maxDays = 3, forceRefresh = false) {
    try {
      this.logger.info(`Getting recent memories, max_days ${maxDays}, force_refresh ${forceRefresh}`);
      
      // Get recent messages
      const recentMessages = await this.dbService.getMemoriesByDateRange(maxDays);
      
      if (recentMessages.length === 0) {
        return {
          raw_messages: [],
          recent_memories: 'No recent memories found.'
        };
      }
      
      // Convert to the expected format
      const rawMessages = recentMessages.map(message => ({
        speaker: message.speaker,
        message: message.message,
        timestamp: message.timestamp.toString(),
        sequence: message.sequence,
        datetime: new Date(message.timestamp * 1000).toISOString()
      }));
      
      // Create a formatted memory string
      const memoryText = recentMessages.map(message => {
        const date = new Date(message.timestamp * 1000);
        const dateStr = date.toISOString().replace('T', ' ').substring(0, 19);
        return `[${dateStr}] ${this.capitalize(message.speaker)}: ${message.message}`;
      }).join('\n');
      
      return {
        raw_messages: rawMessages,
        recent_memories: memoryText
      };
    } catch (error) {
      this.logger.error('Error getting recent memories:', error);
      return {
        raw_messages: [],
        recent_memories: `Error getting recent memories: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }


  async getLatestMemoryAbstract() {
    try {
      this.logger.info('Retrieving latest memory abstract');
      
      // Get the latest memory abstract
      const latestAbstract = await this.dbService.getLatestMemoryAbstract();
      
      if (latestAbstract) {
        return { 
          memories: latestAbstract.abstract_content || 'No memory abstract available.',
          last_updated: latestAbstract.last_processed_timestamp,
          created_at: latestAbstract.created_at
        };
      } else {
        return { 
          memories: 'No memory abstract available.',
          last_updated: null,
          created_at: null
        };
      }
    } catch (error) {
      this.logger.error('Error retrieving latest memory abstract:', error);
      return { 
        memories: `Error retrieving memory abstract: ${error instanceof Error ? error.message : String(error)}`,
        last_updated: null,
        created_at: null
      };
    }
  }

  async updateMemoryAbstract(abstractContent, lastProcessedTimestamp = null) {
    try {
      this.logger.info(`Updating memory abstract with new content`);
      
      // Use provided timestamp or current time
      const timestamp = lastProcessedTimestamp || Math.floor(Date.now() / 1000);
      
      // Save the new abstract to the database
      await this.dbService.saveMemoryAbstract(abstractContent, timestamp);
      
      this.logger.info('Memory abstract saved successfully');
      
      return {
        status: 'success',
        message: 'Memory abstract updated successfully',
        abstract_content: abstractContent,
        last_processed_timestamp: timestamp,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error updating memory abstract:', error);
      return { 
        status: 'error',
        message: `Error updating memory abstract: ${error instanceof Error ? error.message : String(error)}`,
        abstract_content: null,
        last_processed_timestamp: null,
        updated_at: null
      };
    }
  }

  async getMemoryStats() {
    return await this.dbService.getMemoryStats();
  }

  async generateMemorySummary(agentName, daysBack) {
    try {
      const stats = await this.dbService.getMemoryStats();
      
      // This is a simple summary - in a real implementation you might want to 
      // get actual conversation data and create a more detailed summary
      return `Memory Summary for Agent: ${agentName}
      
Looking back ${daysBack} days:
- Total memories stored: ${stats.totalMemories}
- Unique phone numbers: ${stats.uniquePhones}  
- Unique agents: ${stats.uniqueAgents}
- Memory abstracts: ${stats.abstracts}

This is a summary of the stored conversation memories and abstracts for the specified agent.`;
    } catch (error) {
      this.logger.error('Error generating memory summary:', error);
      return `Error generating memory summary: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  combineAbstracts(previousAbstract, newMessages) {
    // Simple combination logic - in a real implementation this would use an LLM
    const newContent = newMessages.slice(0, 10).join('\n'); // Limit to prevent too long text
    
    return `Previous Summary:
${previousAbstract}

Recent Activity:
${newContent}

Combined Understanding: The conversation continues with recent interactions building upon the previous context.`;
  }

  createSimpleSummary(messages) {
    // Simple summary logic - in a real implementation this would use an LLM
    const messageCount = messages.length;
    const recentMessages = messages.slice(-5).join('\n'); // Last 5 messages
    
    return `Conversation Summary (${messageCount} total messages):

Recent Activity:
${recentMessages}

This represents the stored conversation history for this user and agent.`;
  }
} 