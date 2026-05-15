const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./config/db');

const ROOM_PREFIX = 'room:';
const DISCUSSION_SECONDS = Number(process.env.GAME_TIMER_SECONDS || 60);
const INTRO_SECONDS = Number(process.env.GAME_INTRO_SECONDS || 3);
const VOTING_SECONDS = Number(process.env.GAME_VOTING_SECONDS || 30);
const MIN_PLAYERS = Number(process.env.MIN_PLAYERS || 2);

const onlineSockets = new Map();
const userSockets = new Map();
const roomStates = new Map();
const timers = new Map();
const phaseTimeouts = new Map();
const resolvingRooms = new Set();
const offlineGraceTimers = new Map();

let io;

function roomName(roomId) {
  return `${ROOM_PREFIX}${roomId}`;
}

function publicUser(socketUser, socketId, roomId = null) {
  return {
    userId: socketUser.id,
    username: socketUser.username,
    avatar: socketUser.avatar || null,
    socketId,
    roomId,
  };
}

function uniqueOnlineUsers() {
  const users = new Map();
  for (const user of onlineSockets.values()) {
    if (!users.has(user.userId)) users.set(user.userId, user);
  }
  return [...users.values()];
}

function emptyState(roomId) {
  return {
    roomId: Number(roomId),
    phase: 'waiting',
    scenario: null,
    timer: 0,
    votes: new Map(),
    ready: new Map(),
    members: [],
    hostId: null,
    lastResult: null,
    ending: null,
    startedAt: null,
  };
}

function getState(roomId) {
  const id = Number(roomId);
  if (!roomStates.has(id)) roomStates.set(id, emptyState(id));
  return roomStates.get(id);
}

function serializeVotes(votes) {
  const tally = {};
  const byUser = {};
  for (const [userId, choiceId] of votes.entries()) {
    byUser[userId] = choiceId;
    tally[choiceId] = (tally[choiceId] || 0) + 1;
  }
  return { byUser, tally };
}

function serializeState(state, userId = null) {
  const votes = serializeVotes(state.votes);
  return {
    roomId: state.roomId,
    phase: state.phase,
    scenario: state.scenario,
    timer: state.timer,
    members: state.members,
    hostId: state.hostId,
    ready: Object.fromEntries(state.ready),
    votes,
    myVote: userId ? state.votes.get(userId) || null : null,
    lastResult: state.lastResult,
    ending: state.ending,
    startedAt: state.startedAt,
  };
}

async function getMembers(roomId) {
  const [members] = await db.execute(`
    SELECT u.id, u.username, u.avatar, u.trust_score, u.reputation, u.is_online,
           MIN(rm.joined_at) AS joined_at, MAX(COALESCE(rm.is_ready, 0)) AS is_ready
    FROM room_members rm
    JOIN users u ON rm.user_id = u.id
    WHERE rm.room_id = ? AND rm.left_at IS NULL
    GROUP BY u.id, u.username, u.avatar, u.trust_score, u.reputation, u.is_online
    ORDER BY joined_at ASC
  `, [roomId]);
  return members;
}

async function getRoom(roomId) {
  const [rows] = await db.execute('SELECT * FROM rooms WHERE id = ?', [roomId]);
  return rows[0] || null;
}

async function loadScenario(scenarioId) {
  if (!scenarioId) return null;
  const [rows] = await db.execute('SELECT * FROM scenarios WHERE id = ?', [scenarioId]);
  const scenario = rows[0];
  if (!scenario) return null;
  const [choices] = await db.execute(
    'SELECT * FROM scenario_choices WHERE scenario_id = ? ORDER BY id ASC',
    [scenario.id]
  );
  return { ...scenario, choices };
}

async function hydrateState(roomId) {
  const room = await getRoom(roomId);
  if (!room) return null;

  const state = getState(roomId);
  state.hostId = room.host_id;
  state.members = await getMembers(roomId);
  state.ready = new Map(state.members.map((member) => [member.id, Number(member.is_ready) === 1]));

  if (!state.scenario && room.current_scenario_id) {
    state.scenario = await loadScenario(room.current_scenario_id);
  }

  if (state.scenario) {
    if (state.phase === 'waiting') {
      state.phase = state.scenario.is_end ? 'ended' : (room.status === 'active' ? 'discussion_phase' : 'waiting');
    }
    state.timer = state.timer || Number(room.game_timer || DISCUSSION_SECONDS);
  } else {
    state.phase = 'waiting';
  }

  return state;
}

async function broadcastState(roomId, eventName = 'update_story_state') {
  const state = await hydrateState(roomId);
  if (!state) return;
  io.to(roomName(roomId)).emit(eventName, serializeState(state));
}

async function emitRoomPresence(roomId) {
  const state = await hydrateState(roomId);
  if (!state) return;
  io.to(roomName(roomId)).emit('room_state', serializeState(state));
}

function clearRoomTimer(roomId) {
  const id = Number(roomId);
  if (timers.has(id)) {
    clearInterval(timers.get(id));
    timers.delete(id);
  }
  if (phaseTimeouts.has(id)) {
    clearTimeout(phaseTimeouts.get(id));
    phaseTimeouts.delete(id);
  }
}

async function startRoomTimer(roomId, duration, onExpire) {
  const id = Number(roomId);
  if (timers.has(id)) {
    clearInterval(timers.get(id));
    timers.delete(id);
  }
  const state = getState(id);
  state.timer = duration;
  await db.execute('UPDATE rooms SET game_timer = ? WHERE id = ?', [duration, id]).catch(() => {});
  io.to(roomName(id)).emit('update_timer', { roomId: id, remaining: duration });

  const interval = setInterval(async () => {
    const current = getState(id);
    if (!current || !['discussion_phase', 'voting_phase'].includes(current.phase)) {
      clearInterval(interval);
      timers.delete(id);
      return;
    }

    current.timer = Math.max(0, current.timer - 1);
    io.to(roomName(id)).emit('update_timer', { roomId: id, remaining: current.timer });
    if (current.timer % 5 === 0 || current.timer <= 3) {
      await db.execute('UPDATE rooms SET game_timer = ? WHERE id = ?', [current.timer, id]).catch(() => {});
    }

    if (current.timer <= 0) {
      clearInterval(interval);
      timers.delete(id);
      await onExpire?.();
    }
  }, 1000);

  timers.set(id, interval);
}

function schedulePhase(roomId, delayMs, fn) {
  const id = Number(roomId);
  if (phaseTimeouts.has(id)) clearTimeout(phaseTimeouts.get(id));
  const timeout = setTimeout(async () => {
    phaseTimeouts.delete(id);
    await fn();
  }, delayMs);
  phaseTimeouts.set(id, timeout);
}

async function startDiscussion(roomId) {
  const id = Number(roomId);
  const state = getState(id);
  if (!state.scenario || state.phase === 'ended') return;
  state.phase = 'discussion_phase';
  state.timer = DISCUSSION_SECONDS;
  await db.execute('UPDATE rooms SET game_timer = ? WHERE id = ?', [DISCUSSION_SECONDS, id]).catch(() => {});
  io.to(roomName(id)).emit('update_story_state', serializeState(state));
  await startRoomTimer(id, DISCUSSION_SECONDS, () => startVoting(id));
}

async function startVoting(roomId) {
  const id = Number(roomId);
  const state = getState(id);
  if (!state.scenario || state.phase === 'ended') return;
  state.phase = 'voting_phase';
  state.timer = VOTING_SECONDS;
  state.votes = new Map();
  await db.execute('UPDATE rooms SET game_timer = ? WHERE id = ?', [VOTING_SECONDS, id]).catch(() => {});
  io.to(roomName(id)).emit('update_story_state', serializeState(state));
  await startRoomTimer(id, VOTING_SECONDS, () => resolveVotes(id, state.scenario.id));
}

async function transferHostIfNeeded(roomId, leavingUserId) {
  const room = await getRoom(roomId);
  if (!room || room.host_id !== leavingUserId) return room?.host_id || null;

  const members = await getMembers(roomId);
  const nextHost = members.find((member) => member.id !== leavingUserId) || null;
  if (!nextHost) return null;

  await db.execute('UPDATE rooms SET host_id = ? WHERE id = ?', [nextHost.id, roomId]);
  const state = getState(roomId);
  state.hostId = nextHost.id;
  io.to(roomName(roomId)).emit('host_changed', { roomId, hostId: nextHost.id, host: nextHost });
  return nextHost.id;
}

function buildBreakdown(choices, votes, winnerChoice) {
  const tally = {};
  for (const [, choiceId] of votes.entries()) tally[choiceId] = (tally[choiceId] || 0) + 1;
  return choices.map((choice) => ({
    choiceId: choice.id,
    text: choice.text,
    count: tally[choice.id] || 0,
    isWinner: choice.id === winnerChoice.id,
  }));
}

async function finishGame(roomId, scenario, winnerText = null) {
  const state = getState(roomId);
  state.phase = 'ended';
  state.ending = scenario;
  state.timer = 0;
  clearRoomTimer(roomId);

  await db.execute(
    'UPDATE rooms SET status = "closed", current_scenario_id = ?, game_timer = 0, ended_at = NOW() WHERE id = ?',
    [scenario.id, roomId]
  ).catch(() => {});

  const voters = [...state.votes.keys()];
  for (const userId of voters) {
    await db.execute(
      'UPDATE users SET reputation = reputation + 10, trust_score = LEAST(200, trust_score + 2) WHERE id = ?',
      [userId]
    ).catch(() => {});
  }

  const payload = {
    ...serializeState(state),
    ending: scenario,
    winnerText,
  };
  io.to(roomName(roomId)).emit('game_end', payload);
  io.to(roomName(roomId)).emit('update_story_state', payload);
}

async function resolveVotes(roomId, scenarioId) {
  const id = Number(roomId);
  if (resolvingRooms.has(id)) return;
  resolvingRooms.add(id);
  clearRoomTimer(id);

  try {
    const state = getState(id);
    if (!state.scenario || state.scenario.id !== Number(scenarioId)) return;

    state.phase = 'result_phase';
    const [choices] = await db.execute(
      'SELECT * FROM scenario_choices WHERE scenario_id = ? ORDER BY id ASC',
      [scenarioId]
    );
    if (!choices.length) {
      await finishGame(id, state.scenario, null);
      return;
    }

    const tally = serializeVotes(state.votes).tally;
    let winner = choices[0];
    const sorted = Object.entries(tally).sort(([, a], [, b]) => b - a);
    if (sorted.length > 0) {
      winner = choices.find((choice) => choice.id === Number(sorted[0][0])) || choices[0];
    }

    const breakdown = buildBreakdown(choices, state.votes, winner);
    state.lastResult = {
      roomId: id,
      scenarioId,
      winnerChoiceId: winner.id,
      winnerText: winner.text,
      breakdown,
    };

    for (const [userId, choiceId] of state.votes.entries()) {
      await db.execute(
        'INSERT IGNORE INTO votes (user_id, choice_id, points_earned) VALUES (?, ?, ?)',
        [userId, choiceId, choiceId === winner.id ? 15 : 5]
      ).catch(() => {});
    }

    io.to(roomName(id)).emit('vote_decision', {
      ...state.lastResult,
      votes: serializeVotes(state.votes),
    });
    io.to(roomName(id)).emit('update_story_state', serializeState(state));

    await new Promise((resolve) => setTimeout(resolve, 1800));

    const nextScenario = await loadScenario(winner.next_scenario_id);
    if (!nextScenario) {
      await finishGame(id, state.scenario, winner.text);
      return;
    }

    state.scenario = nextScenario;
    state.votes = new Map();
    state.lastResult = null;
    state.phase = nextScenario.is_end ? 'ended' : 'story_intro';
    state.timer = nextScenario.is_end ? 0 : INTRO_SECONDS;

    await db.execute(
      'UPDATE rooms SET current_scenario_id = ?, game_timer = ?, status = ? WHERE id = ?',
      [nextScenario.id, state.timer, nextScenario.is_end ? 'closed' : 'active', id]
    ).catch(() => {});

    const payload = {
      ...serializeState(state),
      prevChoice: winner.text,
    };
    io.to(roomName(id)).emit('next_story', payload);
    io.to(roomName(id)).emit('update_story_state', payload);

    if (nextScenario.is_end) await finishGame(id, nextScenario, winner.text);
    else schedulePhase(id, INTRO_SECONDS * 1000, () => startDiscussion(id));
  } catch (err) {
    console.error('resolveVotes error:', err);
  } finally {
    resolvingRooms.delete(id);
  }
}

async function canStart(roomId, userId) {
  const state = await hydrateState(roomId);
  if (!state) return { ok: false, message: 'Room not found' };
  if (state.hostId !== userId) return { ok: false, message: 'Only the host can start the game' };
  if (state.phase !== 'waiting') return { ok: false, message: 'Game already started' };
  if (state.members.length < MIN_PLAYERS) return { ok: false, message: `Minimum ${MIN_PLAYERS} players required` };
  const allReady = state.members.every((member) => state.ready.get(member.id));
  if (!allReady) return { ok: false, message: 'All players must be ready' };
  return { ok: true, state };
}

async function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const { id: userId, username, avatar } = socket.user;
    if (offlineGraceTimers.has(userId)) {
      clearTimeout(offlineGraceTimers.get(userId));
      offlineGraceTimers.delete(userId);
    }
    const user = publicUser(socket.user, socket.id);
    onlineSockets.set(socket.id, user);
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    await db.execute('UPDATE users SET is_online = 1, last_seen = NOW() WHERE id = ?', [userId]).catch(() => {});
    io.emit('online_status', { userId, username, avatar, status: 'online' });
    socket.emit('online_users', uniqueOnlineUsers());

    const joinRoom = async ({ roomId }) => {
      const id = Number(roomId);
      if (!id) return;

      const room = await getRoom(id);
      if (!room) return socket.emit('socket_error', { message: 'Room not found' });

      const current = onlineSockets.get(socket.id);
      if (current?.roomId && current.roomId !== id) socket.leave(roomName(current.roomId));
      if (current) current.roomId = id;
      socket.join(roomName(id));

      const [activeMember] = await db.execute(
        'SELECT id FROM room_members WHERE room_id = ? AND user_id = ? AND left_at IS NULL LIMIT 1',
        [id, userId]
      );
      if (!activeMember.length) {
        const [oldMember] = await db.execute(
          'SELECT id FROM room_members WHERE room_id = ? AND user_id = ? ORDER BY id ASC LIMIT 1',
          [id, userId]
        );
        if (oldMember.length) {
          await db.execute('UPDATE room_members SET left_at = NULL WHERE id = ?', [oldMember[0].id]);
        } else {
          await db.execute('INSERT INTO room_members (room_id, user_id, is_ready) VALUES (?, ?, 0)', [id, userId]);
        }
      }

      const state = await hydrateState(id);
      io.to(roomName(id)).emit('user_join', {
        roomId: id,
        userId,
        username,
        avatar,
        state: serializeState(state),
      });
      socket.emit('update_story_state', serializeState(state, userId));
      await emitRoomPresence(id);
    };

    const leaveRoom = async ({ roomId }) => {
      const id = Number(roomId);
      if (!id) return;
      socket.leave(roomName(id));
      const current = onlineSockets.get(socket.id);
      if (current) current.roomId = null;
      await db.execute(
        'UPDATE room_members SET left_at = NOW(), is_ready = 0 WHERE room_id = ? AND user_id = ? AND left_at IS NULL',
        [id, userId]
      ).catch(() => {});
      const state = getState(id);
      state.members = await getMembers(id);
      state.ready.delete(userId);
      state.votes.delete(userId);
      await transferHostIfNeeded(id, userId);
      io.to(roomName(id)).emit('user_leave', { roomId: id, userId, username });
      await emitRoomPresence(id);
    };

    const setReady = async ({ roomId, ready }) => {
      const id = Number(roomId);
      const isReady = ready === undefined ? true : Boolean(ready);
      await db.execute(
        'UPDATE room_members SET is_ready = ? WHERE room_id = ? AND user_id = ? AND left_at IS NULL',
        [isReady ? 1 : 0, id, userId]
      ).catch(() => {});
      const state = await hydrateState(id);
      io.to(roomName(id)).emit('ready_update', {
        roomId: id,
        userId,
        ready: isReady,
        state: serializeState(state),
      });
      io.to(roomName(id)).emit('update_story_state', serializeState(state));
    };

    const sendMessage = async ({ roomId, content, clientMessageId }) => {
      const id = Number(roomId);
      const text = String(content || '').trim().slice(0, 600);
      if (!id || !text) return;

      const [result] = await db.execute(
        'INSERT INTO messages (room_id, user_id, content, message_type) VALUES (?, ?, ?, "text")',
        [id, userId, text]
      );
      const message = {
        id: result.insertId,
        clientMessageId: clientMessageId || null,
        roomId: id,
        userId,
        username,
        avatar: avatar || null,
        content: text,
        messageType: 'text',
        timestamp: new Date(),
      };
      io.to(roomName(id)).emit('receive_message', message);
    };

    const typing = ({ roomId, isTyping }) => {
      const id = Number(roomId);
      socket.to(roomName(id)).emit('typing', {
        roomId: id,
        userId,
        username,
        isTyping: Boolean(isTyping),
      });
    };

    const startGame = async ({ roomId }) => {
      const id = Number(roomId);
      const startCheck = await canStart(id, userId);
      if (!startCheck.ok) return socket.emit('socket_error', { message: startCheck.message });

      const [rows] = await db.execute('SELECT * FROM scenarios WHERE is_start = 1 ORDER BY id ASC LIMIT 1');
      const start = rows[0];
      if (!start) return socket.emit('socket_error', { message: 'No start scenario found' });

      const scenario = await loadScenario(start.id);
      const state = getState(id);
      state.hostId = userId;
      state.members = await getMembers(id);
      state.scenario = scenario;
      state.phase = 'story_intro';
      state.votes = new Map();
      state.timer = INTRO_SECONDS;
      state.startedAt = new Date().toISOString();
      state.ending = null;
      state.lastResult = null;

      await db.execute(
        'UPDATE rooms SET status = "active", current_scenario_id = ?, game_timer = ?, started_at = NOW(), ended_at = NULL WHERE id = ?',
        [scenario.id, INTRO_SECONDS, id]
      );

      io.to(roomName(id)).emit('start_game', {
        ...serializeState(state),
        startedBy: { userId, username },
      });
      io.to(roomName(id)).emit('update_story_state', serializeState(state));
      schedulePhase(id, INTRO_SECONDS * 1000, () => startDiscussion(id));
    };

    const voteDecision = async ({ roomId, scenarioId, choiceId }) => {
      const id = Number(roomId);
      const state = getState(id);
      if (state.phase !== 'voting_phase') return socket.emit('socket_error', { message: 'Voting is closed' });
      if (!state.scenario || Number(scenarioId) !== state.scenario.id) {
        return socket.emit('socket_error', { message: 'Story state mismatch' });
      }
      const choiceExists = state.scenario.choices.some((choice) => choice.id === Number(choiceId));
      if (!choiceExists) return socket.emit('socket_error', { message: 'Invalid choice' });

      state.votes.set(userId, Number(choiceId));
      const votes = serializeVotes(state.votes);
      io.to(roomName(id)).emit('vote_decision', {
        roomId: id,
        scenarioId: state.scenario.id,
        userId,
        username,
        choiceId: Number(choiceId),
        votes,
        totalVoters: state.members.length,
      });
      io.to(roomName(id)).emit('update_story_state', serializeState(state));

      if (state.members.length > 0 && state.votes.size >= state.members.length) {
        await resolveVotes(id, state.scenario.id);
      }
    };

    const sync = async ({ roomId }) => {
      const id = Number(roomId);
      const state = await hydrateState(id);
      if (!state) return;
      socket.emit('update_story_state', serializeState(state, userId));
    };

    socket.on('user_join', joinRoom);
    socket.on('room:join', joinRoom);
    socket.on('user_leave', leaveRoom);
    socket.on('room:leave', leaveRoom);
    socket.on('player_ready', setReady);
    socket.on('ready:toggle', setReady);
    socket.on('send_message', sendMessage);
    socket.on('chat:message', sendMessage);
    socket.on('typing', typing);
    socket.on('start_game', startGame);
    socket.on('game:start', startGame);
    socket.on('vote_decision', voteDecision);
    socket.on('vote:submit', voteDecision);
    socket.on('player:sync', sync);

    socket.on('disconnect', async () => {
      const current = onlineSockets.get(socket.id);
      onlineSockets.delete(socket.id);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }

      if (current?.roomId) {
        io.to(roomName(current.roomId)).emit('user_leave', {
          roomId: current.roomId,
          userId,
          username,
          disconnected: true,
        });
        await emitRoomPresence(current.roomId);
      }

      if (!userSockets.has(userId)) {
        const graceTimer = setTimeout(async () => {
          if (userSockets.has(userId)) return;
          await db.execute('UPDATE users SET is_online = 0, last_seen = NOW() WHERE id = ?', [userId]).catch(() => {});
          io.emit('online_status', { userId, username, avatar, status: 'offline' });
          offlineGraceTimers.delete(userId);
        }, 5000);
        offlineGraceTimers.set(userId, graceTimer);
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

module.exports = { initSocket, getIO };
