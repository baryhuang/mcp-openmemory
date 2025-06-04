import { DatabaseService } from './database.js';
import { MemoryService } from './memory.js';
import { Logger } from './logger.js';
import fs from 'fs';

const logger = new Logger('memory-test');

async function cleanupTestDb(dbPath) {
    try {
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            logger.info(`Test database ${dbPath} cleaned up successfully`);
        }
    } catch (error) {
        logger.error(`Failed to cleanup test database: ${error.message}`);
    }
}

async function testMemorySystem() {
    const dbPath = 'test-mcp-memory.sqlite';
    const testResults = {
        totalScenarios: 5,
        passedScenarios: 0,
        failedScenarios: 0,
        scenarios: {}
    };

    try {
        // Initialize services
        const dbService = new DatabaseService(dbPath);
        await dbService.initialize();
        const memoryService = new MemoryService(dbService);
        
        logger.info('Starting memory system test...\n');

        let abstract; // Declare abstract variable for use across scenarios

        // Scenario 1: Save some conversation memories about a project
        try {
            logger.info('Scenario 1: Saving project discussion memories...');
            await memoryService.saveMemory({
                speaker: 'user',
                message: 'I want to build a web application using React and Node.js',
                context: 'project_planning'
            });

            await memoryService.saveMemory({
                speaker: 'agent',
                message: 'I suggest using Next.js for the frontend and Express for the backend. We should also consider using TypeScript.',
                context: 'project_planning'
            });

            await memoryService.saveMemory({
                speaker: 'user',
                message: 'That sounds good. I also want to use MongoDB for the database.',
                context: 'project_planning'
            });
            testResults.scenarios['Scenario 1'] = { status: 'PASSED', name: 'Save conversation memories' };
            testResults.passedScenarios++;
        } catch (error) {
            testResults.scenarios['Scenario 1'] = { status: 'FAILED', name: 'Save conversation memories', error: error.message };
            testResults.failedScenarios++;
        }

        // Scenario 2: Create a memory abstract
        try {
            logger.info('\nScenario 2: Creating memory abstract...');
            abstract = 'User is planning a web application. Tech stack decisions: Next.js (frontend), Express (backend), TypeScript, and MongoDB (database). The project is in initial planning phase.';
            await memoryService.updateMemoryAbstract(abstract);
            testResults.scenarios['Scenario 2'] = { status: 'PASSED', name: 'Create memory abstract' };
            testResults.passedScenarios++;
        } catch (error) {
            testResults.scenarios['Scenario 2'] = { status: 'FAILED', name: 'Create memory abstract', error: error.message };
            testResults.failedScenarios++;
        }

        // Scenario 3: Retrieve recent memories
        try {
            logger.info('\nScenario 3: Retrieving recent memories...');
            const recentMemories = await memoryService.getRecentMemories(1);
            logger.info('Recent memories:', JSON.stringify(recentMemories, null, 2));
            testResults.scenarios['Scenario 3'] = { status: 'PASSED', name: 'Retrieve recent memories' };
            testResults.passedScenarios++;
        } catch (error) {
            testResults.scenarios['Scenario 3'] = { status: 'FAILED', name: 'Retrieve recent memories', error: error.message };
            testResults.failedScenarios++;
        }

        // Scenario 4: Recall memory abstract
        try {
            logger.info('\nScenario 4: Recalling memory abstract...');
            const memoryAbstract = await memoryService.getLatestMemoryAbstract();
            logger.info('Memory abstract:', JSON.stringify(memoryAbstract, null, 2));
            testResults.scenarios['Scenario 4'] = { status: 'PASSED', name: 'Recall memory abstract' };
            testResults.passedScenarios++;
        } catch (error) {
            testResults.scenarios['Scenario 4'] = { status: 'FAILED', name: 'Recall memory abstract', error: error.message };
            testResults.failedScenarios++;
        }

        // Scenario 5: Add new context to existing project
        try {
            logger.info('\nScenario 5: Adding new context to existing project...');
            await memoryService.saveMemory({
                speaker: 'user',
                message: 'I also want to implement user authentication with JWT tokens',
                context: 'project_planning'
            });

            await memoryService.saveMemory({
                speaker: 'agent',
                message: 'Good choice. We can use Passport.js with JWT strategy for authentication.',
                context: 'project_planning'
            });

            const updatedAbstract = abstract + ' Authentication will be implemented using Passport.js with JWT tokens.';
            await memoryService.updateMemoryAbstract(updatedAbstract);

            const finalMemories = await memoryService.getRecentMemories(1);
            const finalAbstract = await memoryService.getLatestMemoryAbstract();
            
            logger.info('\nFinal recent memories:', JSON.stringify(finalMemories, null, 2));
            logger.info('\nFinal memory abstract:', JSON.stringify(finalAbstract, null, 2));
            
            testResults.scenarios['Scenario 5'] = { status: 'PASSED', name: 'Add new context and update abstract' };
            testResults.passedScenarios++;
        } catch (error) {
            testResults.scenarios['Scenario 5'] = { status: 'FAILED', name: 'Add new context and update abstract', error: error.message };
            testResults.failedScenarios++;
        }

    } catch (error) {
        logger.error('Test failed:', error);
    } finally {
        // Print test results report
        logger.info('\n=== Memory System Test Report ===');
        logger.info(`Total Scenarios: ${testResults.totalScenarios}`);
        logger.info(`Passed: ${testResults.passedScenarios}`);
        logger.info(`Failed: ${testResults.failedScenarios}`);
        logger.info('\nDetailed Results:');
        Object.entries(testResults.scenarios).forEach(([scenario, result]) => {
            logger.info(`${scenario}: ${result.status} - ${result.name}`);
            if (result.error) {
                logger.error(`  Error: ${result.error}`);
            }
        });
        logger.info('===============================\n');

        // Cleanup test database
        await cleanupTestDb(dbPath);
    }
}

testMemorySystem(); 