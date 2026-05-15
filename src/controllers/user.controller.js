const db = require('../config/db');

// GET /api/users
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, username, email, role, trust_score, reputation, is_online, avatar, last_seen, created_at FROM users ORDER BY reputation DESC'
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/online
const getOnlineUsers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, username, avatar, role, trust_score, reputation FROM users WHERE is_online = 1'
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, username, email, role, trust_score, reputation, avatar, is_online, last_seen, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.id, u.username, u.avatar, u.trust_score, u.reputation,
             COUNT(DISTINCT v.id) AS total_votes,
             COUNT(DISTINCT v.id) AS correct_votes,
             COALESCE(SUM(v.points_earned), 0) AS total_points
      FROM users u
      LEFT JOIN votes v ON u.id = v.user_id
      WHERE u.role = 'player'
      GROUP BY u.id
      ORDER BY total_points DESC, u.reputation DESC, u.trust_score DESC
      LIMIT 20
    `);
    res.json({ success: true, leaderboard: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { username, avatar } = req.body;
    await db.execute('UPDATE users SET username = ?, avatar = ? WHERE id = ?', [username, avatar, req.user.id]);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllUsers, getOnlineUsers, getUserById, getLeaderboard, updateProfile };
