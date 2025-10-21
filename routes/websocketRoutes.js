import { 
  getGame, 
  addPlayer, 
  removePlayer, 
  setHostConnection,
  handlePlayerAnswer,
  advanceGameState 
} from '../memory-storage/activeGames.js';

export async function setupWebSocketRoutes(fastify, options) {
  console.log('🔌 Setting up WebSocket routes...');
  
  // WebSocket for players
  fastify.get('/ws/player/:gameId', { websocket: true }, (socket, req) => {
    console.log(`👤 Player WebSocket connection attempt for game: ${req.params.gameId}`);
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
        console.error('Error processing player message:', error);
      }
    });

    socket.on('close', () => {
      console.log(`Player ${playerId} disconnected from game ${gameId}`);
      removePlayer(gameId, playerId);
    });

    socket.on('error', (err) => {
      console.error(`WebSocket error for player ${playerId}:`, err);
    });
  });

  // WebSocket for host
  fastify.get('/ws/host/:gameId', { websocket: true }, (socket, req) => {
    console.log(`🎮 Host WebSocket connection attempt for game: ${req.params.gameId}`);
    const { gameId } = req.params;
    const game = getGame(gameId);
    
    if (!game) {
      socket.close(4000, 'Game not found');
      return;
    }

    setHostConnection(gameId, socket);
    console.log(`Host connected to game ${gameId}`);
    
    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleHostMessage(gameId, data);
      } catch (error) {
        console.error('Error processing host message:', error);
      }
    });

    socket.on('close', () => {
      console.log(`Host disconnected from game ${gameId}`);
      setHostConnection(gameId, null);
    });

    socket.on('error', (err) => {
      console.error(`WebSocket error for host in game ${gameId}:`, err);
    });
  });
}

function handlePlayerMessage(gameId, playerId, data, socket) {
  const game = getGame(gameId);
  
  switch (data.type) {
    case 'join_game':
      console.log(`Player ${playerId} joining game ${gameId} as ${data.playerName}`);
      game.players[playerId].name = data.playerName;
      game.players[playerId].avatar = data.avatarUrl;
      
      socket.send(JSON.stringify({
        type: 'joined_success',
        playerName: data.playerName,
        avatarUrl: data.avatarUrl
      }));
      
      console.log(`Notifying host about player update. Total players: ${Object.keys(game.players).length}`);
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