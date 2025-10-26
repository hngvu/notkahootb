import { 
  getGame, 
  addPlayer, 
  removePlayer, 
  setHostConnection,
  handlePlayerAnswer,
  advanceGameState 
} from '../memory-storage/activeGames.js';

export async function setupWebSocketRoutes(fastify, options) {
  
  // WebSocket for players
  fastify.get('/ws/player/:gameId', { websocket: true }, (socket, req) => {
    const { gameId } = req.params;
    const game = getGame(gameId);
    
    if (!game) {
      socket.close(4000, 'Game not found');
      return;
    }

    const playerId = Math.random().toString(36).substring(7);
    
    // Add player to game
    addPlayer(gameId, playerId, socket);
    
    socket.send(JSON.stringify({ 
      type: 'player_joined', 
      playerId 
    }));

    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handlePlayerMessage(gameId, playerId, data, socket);
      } catch (error) {
        // Silently handle parsing errors
      }
    });

    socket.on('close', () => {
      removePlayer(gameId, playerId);
    });

    socket.on('error', (err) => {
      // Silently handle errors
    });
  });

  // WebSocket for host
  fastify.get('/ws/host/:gameId', { websocket: true }, (socket, req) => {
    const { gameId } = req.params;
    const game = getGame(gameId);
    
    if (!game) {
      socket.close(4000, 'Game not found');
      return;
    }

    setHostConnection(gameId, socket);
    
    // Send initial game state to host
    const players = Object.values(game.players).map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score
    }));
    
    socket.send(JSON.stringify({
      type: 'player_list_updated',
      players
    }));
    
    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleHostMessage(gameId, data);
      } catch (error) {
        // Silently handle parsing errors
      }
    });

    socket.on('close', () => {
      setHostConnection(gameId, null);
    });

    socket.on('error', (err) => {
      // Silently handle errors
    });
  });
}

function handlePlayerMessage(gameId, playerId, data, socket) {
  const game = getGame(gameId);
  
  switch (data.type) {
    case 'join_game':
      game.players[playerId].name = data.playerName;
      game.players[playerId].avatar = data.avatarUrl;
      
      socket.send(JSON.stringify({
        type: 'joined_success',
        playerName: data.playerName,
        avatarUrl: data.avatarUrl
      }));
      
      notifyHostPlayerUpdate(game);
      break;
      
    case 'submit_answer':
      handlePlayerAnswer(gameId, playerId, data.answerIndex, data.timeLeft);
      break;
  }
}

function handleHostMessage(gameId, data) {
  switch (data.type) {
    case 'start_game':
    case 'next_question':
    case 'show_leaderboard':
    case 'end_game':
      advanceGameState(gameId, data.type);
      break;
  }
}

function notifyHostPlayerUpdate(game) {
  if (game.hostConnection) {
    const players = Object.values(game.players).map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score
    }));
    
    game.hostConnection.send(JSON.stringify({
      type: 'player_list_updated',
      players
    }));
  }
}