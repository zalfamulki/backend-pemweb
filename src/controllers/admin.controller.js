const db = require('../config/db');

// GET /api/admin/stats
const getDashboardStats = async (req, res) => {
  try {
    const [[users]]   = await db.execute('SELECT COUNT(*) AS total FROM users WHERE role = "player"');
    const [[online]]  = await db.execute('SELECT COUNT(*) AS total FROM users WHERE is_online = 1');
    const [[news]]    = await db.execute('SELECT COUNT(*) AS total FROM news');
    const [[rooms]]   = await db.execute('SELECT COUNT(*) AS total FROM rooms WHERE status != "closed"');
    const [[votes]]   = await db.execute('SELECT COUNT(*) AS total FROM votes');
    const [[msgs]]    = await db.execute('SELECT COUNT(*) AS total FROM messages');

    res.json({
      success: true,
      stats: {
        total_players:  users.total,
        online_players: online.total,
        total_news:     news.total,
        active_rooms:   rooms.total,
        total_votes:    votes.total,
        total_messages: msgs.total
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/users
const manageUsers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, username, email, role, trust_score, reputation, is_online, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/admin/users/:id/role
const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['player', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ success: true, message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/messages
const getAllMessages = async (req, res) => {
  try {
    const limit  = parseInt(req.query.limit)  || 50;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await db.execute(`
      SELECT m.*, u.username, u.avatar, r.name AS room_name
      FROM messages m
      JOIN users u ON m.user_id = u.id
      JOIN rooms r ON m.room_id = r.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    res.json({ success: true, messages: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/admin/messages/:id
const deleteMessage = async (req, res) => {
  try {
    await db.execute('DELETE FROM messages WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboardStats, manageUsers, changeUserRole, deleteUser, getAllMessages, deleteMessage };
