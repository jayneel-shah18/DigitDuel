const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'game.html'));
});

const rooms = new Map();
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('create-room', ({ name, avatar }) => {
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const playerInfo = {
      1: { name: name || 'Player 1', avatar: avatar || '🐨' },
      2: { name: 'Player 2', avatar: '🐨' }
    };

    const room = {
      code: roomCode,
      players: [socket.id],
      playerNames: { [socket.id]: name || 'Player 1' },
      playerInfo,
      secrets: {},
      setupPhase: 1,
      currentPlayer: 1,
      playerSockets: { 1: socket.id },
      guesses: { 1: [], 2: [] },
      attempts: { 1: 0, 2: 0 },
      gameOver: false,
      winner: null,
      seriesWins: { 1: 0, 2: 0 },
      fairPlay: {
        pendingFinalTurn: false,
        provisionalWinner: null
      }
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerNumber = 1;

    socket.emit('room-created', { 
      roomCode, 
      playerNumber: 1,
      setupPhase: 1,
      playerInfo
    });

    console.log(`Room ${roomCode} created by ${socket.id} (${name})`);
  });

  socket.on('join-room', ({ code, name, avatar }) => {
    const roomCode = code.toUpperCase().trim();
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('room-error', { message: 'Room not found. Please check the code.' });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('room-error', { message: 'Room is full. Maximum 2 players allowed.' });
      return;
    }

    if (room.setupPhase > 1) {
      socket.emit('room-error', { message: 'Game already in progress.' });
      return;
    }

    room.players.push(socket.id);
    room.playerNames[socket.id] = name || 'Player 2';
    room.playerInfo[2] = { name: name || 'Player 2', avatar: avatar || '🐨' };
    room.playerSockets[2] = socket.id;
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerNumber = 2;

    socket.emit('room-joined', { 
      roomCode, 
      playerNumber: 2,
      setupPhase: room.setupPhase,
      playerInfo: room.playerInfo
    });

    io.to(room.playerSockets[1]).emit('player-joined', { 
      playerNumber: 2,
      playerInfo: room.playerInfo
    });

    console.log(`${socket.id} joined room ${roomCode} as ${name}`);
  });

  socket.on('set-secret', ({ secret }) => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Room not found.' });
      return;
    }

    const playerNum = socket.playerNumber;
    room.secrets[playerNum] = secret;

    console.log(`Player ${playerNum} set secret in room ${roomCode}`);

    if (room.secrets[1] && room.secrets[2]) {
      room.setupPhase = 3;
      room.currentPlayer = 1;
      
      // Notify both players that game is starting
      io.to(roomCode).emit('game-start', {
        currentPlayer: 1,
        playerInfo: room.playerInfo
      });
      
      console.log(`Game started in room ${roomCode}`);
    } else {
      socket.emit('secret-set', { 
        playerNumber: playerNum,
        waitingForOther: !(room.secrets[1] && room.secrets[2])
      });
      
      const otherPlayerNum = playerNum === 1 ? 2 : 1;
      const otherSocketId = room.playerSockets[otherPlayerNum];
      if (otherSocketId) {
        io.to(otherSocketId).emit('opponent-secret-set', {
          playerNumber: playerNum
        });
      }
    }
  });

  socket.on('submit-guess', ({ guess }) => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Room not found.' });
      return;
    }

    if (room.gameOver) {
      socket.emit('error', { message: 'Game is over.' });
      return;
    }

    const playerNum = socket.playerNumber;

    if (playerNum !== room.currentPlayer) {
      socket.emit('error', { message: 'It is not your turn.' });
      return;
    }

    const targetPlayerNum = playerNum === 1 ? 2 : 1;
    const targetSecret = room.secrets[targetPlayerNum];

    const result = evaluateGuess(targetSecret, guess);
    
    room.attempts[playerNum]++;
    room.guesses[playerNum].push({ guess, result });

    const isCorrect = result.correctPlace === 5;
    
    io.to(roomCode).emit('guess-submitted', {
      playerNumber: playerNum,
      guess,
      result,
      attempts: room.attempts[playerNum],
      isCorrect
    });

    console.log(`Player ${playerNum} guessed ${guess} in room ${roomCode}`);

    if (isCorrect) {
      if (playerNum === 1 && !room.fairPlay.pendingFinalTurn) {
        room.fairPlay.pendingFinalTurn = true;
        room.fairPlay.provisionalWinner = 1;
        room.currentPlayer = 2;

        io.to(roomCode).emit('player1-won-final-chance', {
          currentPlayer: 2,
          attempts: room.attempts,
          player1Name: room.playerInfo[1].name,
          player2Name: room.playerInfo[2].name
        });

        console.log(`Player 1 won in room ${roomCode}, giving Player 2 final chance`);
        return;
      }

      room.gameOver = true;

      if (room.fairPlay.pendingFinalTurn && playerNum === 2) {
        room.winner = 0;
        console.log(`Game tied in room ${roomCode}`);
      } else {
        room.winner = playerNum;
        room.seriesWins[playerNum]++;
        console.log(`Player ${playerNum} won in room ${roomCode}`);
      }

      io.to(roomCode).emit('game-over', {
        winner: room.winner,
        attempts: room.attempts,
        secrets: room.secrets,
        seriesScore: room.seriesWins,
        isTie: room.winner === 0
      });

      return;
    } else {
      if (room.fairPlay.pendingFinalTurn && playerNum === 2) {
        room.gameOver = true;
        room.winner = room.fairPlay.provisionalWinner;
        room.seriesWins[room.winner]++;

        io.to(roomCode).emit('game-over', {
          winner: room.winner,
          attempts: room.attempts,
          secrets: room.secrets,
          seriesScore: room.seriesWins
        });

        return;
      }

      room.currentPlayer = room.currentPlayer === 1 ? 2 : 1;

      io.to(roomCode).emit('turn-changed', {
        currentPlayer: room.currentPlayer,
        attempts: room.attempts
      });
    }
      });

  // Play again (rematch)
  socket.on('play-again', () => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Room not found.' });
      return;
    }

    room.fairPlay = {
      pendingFinalTurn: false,
      provisionalWinner: null
    };
    
    if (!room.playAgainVotes) {
      room.playAgainVotes = new Set();
    }

    room.playAgainVotes.add(socket.playerNumber);

    if (room.playAgainVotes.size === 2) {
      room.secrets = {};
      room.setupPhase = 1;
      room.currentPlayer = 1;
      room.guesses = { 1: [], 2: [] };
      room.attempts = { 1: 0, 2: 0 };
      room.gameOver = false;
      room.winner = null;
      room.playAgainVotes = new Set();

      io.to(roomCode).emit('game-reset', {
        seriesScore: room.seriesWins
      });

      console.log(`Game reset in room ${roomCode}, series score: P1=${room.seriesWins[1]}, P2=${room.seriesWins[2]}`);
    } else {
      socket.emit('waiting-for-rematch', {
        message: 'Waiting for opponent to accept rematch...'
      });
      
      const otherPlayerNum = socket.playerNumber === 1 ? 2 : 1;
      const otherSocketId = room.playerSockets[otherPlayerNum];
      if (otherSocketId) {
        io.to(otherSocketId).emit('opponent-wants-rematch', {
          message: 'Opponent wants to play again!'
        });
      }
    }
  });

  socket.on('exit-room', () => {
    const roomCode = socket.roomCode;
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        socket.to(roomCode).emit('player-disconnected', {
          playerNumber: socket.playerNumber
        });
        
        const index = room.players.indexOf(socket.id);
        if (index > -1) {
          room.players.splice(index, 1);
        }

        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted (all players left)`);
        }
      }
      
      socket.leave(roomCode);
      socket.roomCode = null;
      socket.playerNumber = null;
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const roomCode = socket.roomCode;
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        io.to(roomCode).emit('player-disconnected', {
          playerNumber: socket.playerNumber
        });

        setTimeout(() => {
          const currentRoom = rooms.get(roomCode);
          if (currentRoom && currentRoom.players.includes(socket.id)) {
            rooms.delete(roomCode);
            console.log(`Room ${roomCode} deleted due to inactivity`);
          }
        }, 5 * 60 * 1000);
      }
    }
  });
});

function evaluateGuess(secret, guess) {
  const length = secret.length;
  const statuses = Array(length).fill("absent");
  let correctPlace = 0;
  let correctDigits = 0;

  const secretArr = secret.split("");
  const guessArr = guess.split("");
  const usedSecret = Array(length).fill(false);

  for (let i = 0; i < length; i++) {
    if (guessArr[i] === secretArr[i]) {
      statuses[i] = "correct";
      correctPlace++;
      correctDigits++;
      usedSecret[i] = true;
    }
  }

  for (let i = 0; i < length; i++) {
    if (statuses[i] === "correct") continue;
    const digit = guessArr[i];

    for (let j = 0; j < length; j++) {
      if (!usedSecret[j] && digit === secretArr[j]) {
        statuses[i] = "present";
        correctDigits++;
        usedSecret[j] = true;
        break;
      }
    }
  }

  return {
    statuses,
    correctPlace,
    correctDigits,
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
