import { parseQuestionFile } from '../utils/questionParser.js';
import { createNewGame, getGame } from '../memory-storage/activeGames.js';
import { HOST_PASSWORD } from '../config/constants.js';

export async function setupGameRoutes(fastify, options) {
  
  // Host login
  fastify.post('/host/login', async (request, reply) => {
    const { password } = request.body;
    if (password === HOST_PASSWORD) {
      return { 
        status: 'success', 
        token: 'kahoot123' 
      };
    } else {
      reply.code(401).send({ error: 'Invalid password' });
    }
  });

  // Upload questions and create game
  fastify.post('/host/upload', async (request, reply) => {
    try {
      const data = await request.file();
      const questions = await parseQuestionFile(data);
      
      const game = createNewGame(questions);
      
      return { 
        gameId: game.id, 
        questionCount: questions.length,
        message: 'Game created successfully' 
      };
    } catch (error) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Get game info
  fastify.get('/game/:gameId', async (request, reply) => {
    const { gameId } = request.params;
    const game = getGame(gameId);
    
    if (!game) {
      reply.code(404).send({ error: 'Game not found' });
      return;
    }
    
    return {
      id: game.id,
      playerCount: Object.keys(game.players).length,
      currentQuestion: game.currentQuestion + 1,
      totalQuestions: game.questions.length
    };
  });
}