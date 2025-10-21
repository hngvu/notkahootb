// In-memory storage for active games
const activeGames = new Map();

export function createNewGame(questions) {
  const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const game = {
    id: gameId,
    questions,
    currentQuestion: 0,
    state: 'waiting',
    players: {},
    hostConnection: null,
    startTime: null,
    leaderboard: []
  };
  
  activeGames.set(gameId, game);
  console.log(`🎮 Game created: ${gameId} with ${questions.length} questions`);
  return game;
}

export function getGame(gameId) {
  return activeGames.get(gameId);
}

export function addPlayer(gameId, playerId, socket) {
  const game = activeGames.get(gameId);
  if (game) {
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${playerId}`;
    
    game.players[playerId] = {
      id: playerId,
      socket,
      name: '',
      avatar: defaultAvatar,
      score: 0,
      currentAnswer: null,
      lastAnswerCorrect: false
    };
  }
}

export function removePlayer(gameId, playerId) {
  const game = activeGames.get(gameId);
  if (game && game.players[playerId]) {
    delete game.players[playerId];
  }
}

export function setHostConnection(gameId, connection) {
  const game = activeGames.get(gameId);
  if (game) {
    game.hostConnection = connection;
  }
}

export function handlePlayerAnswer(gameId, playerId, answerIndex, timeLeft) {
  const game = activeGames.get(gameId);
  if (!game || game.state !== 'question') return;

  const player = game.players[playerId];
  if (!player || player.currentAnswer !== null) return; // Already answered
  
  const currentQuestion = game.questions[game.currentQuestion];
  const isCorrect = answerIndex === currentQuestion.correctIndex;
  let pointsEarned = 0;
  
  if (isCorrect) {
    // Base points + time bonus (faster = more points)
    pointsEarned = 500 + (timeLeft * 50); // Max 1500 points if answered at 20s
    player.score += pointsEarned;
    player.lastAnswerCorrect = true;
    player.lastPoints = pointsEarned;
  } else {
    player.lastAnswerCorrect = false;
    player.lastPoints = 0;
  }
  
  player.currentAnswer = answerIndex;
  
  console.log(`Player ${player.name} answered ${isCorrect ? 'correctly' : 'incorrectly'}, earned ${pointsEarned} points`);
  
  // Don't send immediate feedback, wait for timer to end
}

export function advanceGameState(gameId, action) {
  const game = activeGames.get(gameId);
  if (!game) return;
  
  console.log(`🎮 Advancing game ${gameId} state: ${action}`);
  
  switch (action) {
    case 'start_game':
      game.state = 'question';
      game.startTime = Date.now();
      game.currentQuestion = 0;
      game.questionStartTime = Date.now();
      
      // Reset player answers
      Object.values(game.players).forEach(player => {
        player.currentAnswer = null;
        player.lastAnswerCorrect = false;
      });
      
      // Send first question to all players
      broadcastToPlayers(game, {
        type: 'new_question',
        question: {
          text: game.questions[0].text,
          options: game.questions[0].options
        },
        questionNumber: 1,
        totalQuestions: game.questions.length,
        timeLimit: 20
      });
      
      // Auto show results after 20 seconds
      setTimeout(() => {
        if (game.state === 'question' && game.currentQuestion === 0) {
          showQuestionResults(gameId);
        }
      }, 20000);
      
      console.log(`🎮 Game ${gameId} started with ${game.questions.length} questions`);
      break;
      
    case 'next_question':
      if (game.currentQuestion < game.questions.length - 1) {
        game.currentQuestion++;
        game.state = 'question';
        game.questionStartTime = Date.now();
        
        // Reset player answers for new question
        Object.values(game.players).forEach(player => {
          player.currentAnswer = null;
          player.lastAnswerCorrect = false;
        });
        
        broadcastToPlayers(game, {
          type: 'new_question',
          question: {
            text: game.questions[game.currentQuestion].text,
            options: game.questions[game.currentQuestion].options
          },
          questionNumber: game.currentQuestion + 1,
          totalQuestions: game.questions.length,
          timeLimit: 20
        });
        
        // Auto show results after 20 seconds
        const currentQ = game.currentQuestion;
        setTimeout(() => {
          if (game.state === 'question' && game.currentQuestion === currentQ) {
            showQuestionResults(gameId);
          }
        }, 20000);
        
        console.log(`🎮 Game ${gameId} advanced to question ${game.currentQuestion + 1}`);
      } else {
        game.state = 'finished';
        updateLeaderboard(game);
        broadcastToAll(game, {
          type: 'game_over',
          finalLeaderboard: game.leaderboard
        });
        console.log(`🎮 Game ${gameId} finished`);
      }
      break;
      
    case 'show_results':
      showQuestionResults(gameId);
      break;
      
    case 'end_game':
      game.state = 'finished';
      updateLeaderboard(game);
      broadcastToAll(game, {
        type: 'game_over',
        finalLeaderboard: game.leaderboard
      });
      console.log(`🎮 Game ${gameId} ended`);
      break;
  }
}

function showQuestionResults(gameId) {
  const game = activeGames.get(gameId);
  if (!game) return;
  
  game.state = 'results';
  const currentQuestion = game.questions[game.currentQuestion];
  
  // Calculate answer statistics
  const answerStats = [0, 0, 0, 0];
  const totalAnswers = Object.values(game.players).filter(p => p.currentAnswer !== null).length;
  
  Object.values(game.players).forEach(player => {
    if (player.currentAnswer !== null) {
      answerStats[player.currentAnswer]++;
    }
  });
  
  // Calculate percentages
  const answerPercentages = answerStats.map(count => 
    totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0
  );
  
  // Update leaderboard
  updateLeaderboard(game);
  
  // Send results to all players
  broadcastToPlayers(game, {
    type: 'question_results',
    correctAnswer: currentQuestion.correctIndex,
    answerStats: answerStats,
    answerPercentages: answerPercentages,
    isCorrect: null // Will be set per player
  });
  
  // Send individual results to each player
  Object.values(game.players).forEach(player => {
    player.socket.send(JSON.stringify({
      type: 'your_result',
      correct: player.lastAnswerCorrect,
      correctAnswer: currentQuestion.correctIndex,
      yourAnswer: player.currentAnswer,
      points: player.lastAnswerCorrect ? player.lastPoints : 0
    }));
  });
  
  // Send stats to host
  if (game.hostConnection && game.hostConnection.readyState === 1) {
    game.hostConnection.send(JSON.stringify({
      type: 'question_results',
      correctAnswer: currentQuestion.correctIndex,
      answerStats: answerStats,
      answerPercentages: answerPercentages,
      totalAnswers: totalAnswers,
      totalPlayers: Object.keys(game.players).length,
      question: currentQuestion
    }));
  }
  
  // Show leaderboard after 3 seconds
  setTimeout(() => {
    if (game.state === 'results') {
      game.state = 'leaderboard';
      updateLeaderboard(game);
      broadcastToAll(game, {
        type: 'show_leaderboard',
        leaderboard: game.leaderboard
      });
    }
  }, 3000);
  
  console.log(`🎮 Game ${gameId} showing results. Stats: ${answerStats.join(', ')}`);
}

function updateLeaderboard(game) {
  game.leaderboard = Object.values(game.players)
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      rank: index + 1,
      name: player.name,
      avatar: player.avatar,
      score: player.score
    }));
}

function broadcastToPlayers(game, message) {
  const messageString = JSON.stringify(message);
  Object.values(game.players).forEach(player => {
    if (player.socket.readyState === 1) {
      player.socket.send(messageString);
    }
  });
}

function broadcastToAll(game, message) {
  const messageString = JSON.stringify(message);
  
  // Send to all players
  Object.values(game.players).forEach(player => {
    if (player.socket && player.socket.readyState === 1) {
      player.socket.send(messageString);
    }
  });
  
  // Send to host
  if (game.hostConnection && game.hostConnection.readyState === 1) {
    game.hostConnection.send(messageString);
  }
}

// Clean up old games (optional)
setInterval(() => {
  const now = Date.now();
  for (const [gameId, game] of activeGames.entries()) {
    // Remove games older than 24 hours
    if (game.startTime && (now - game.startTime > 24 * 60 * 60 * 1000)) {
      activeGames.delete(gameId);
      console.log(`🧹 Removed old game: ${gameId}`);
    }
  }
}, 60 * 60 * 1000);