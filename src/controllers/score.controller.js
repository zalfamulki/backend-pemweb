const db = require('../config/db');

// GET /api/scores/me
const getMyScores = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT v.*, sc.text AS choice_text, s.title AS scenario_title
      FROM votes v
      JOIN scenario_choices sc ON v.choice_id = sc.id
      JOIN scenarios s ON sc.scenario_id = s.id
      WHERE v.user_id = ?
      ORDER BY v.created_at DESC
    `, [req.user.id]);

    const [summary] = await db.execute(`
      SELECT COUNT(*) AS total_votes,
             COUNT(*) AS correct_votes,
             SUM(points_earned) AS total_points
      FROM votes WHERE user_id = ?
    `, [req.user.id]);

    res.json({ success: true, history: rows, summary: summary[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/scores/leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.id, u.username, u.avatar, u.trust_score, u.reputation,
             COUNT(v.id)                                               AS total_votes,
             COUNT(v.id)                                               AS correct_votes,
             COALESCE(SUM(v.points_earned), 0)                        AS total_points,
             ROUND(COUNT(v.id) / NULLIF(COUNT(v.id),0) * 100, 1)       AS accuracy
      FROM users u
      LEFT JOIN votes v ON u.id = v.user_id
      WHERE u.role = 'player'
      GROUP BY u.id
      ORDER BY total_points DESC, accuracy DESC
      LIMIT 20
    `);
    res.json({ success: true, leaderboard: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/scores/room/:roomId
const getRoomScores = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.id, u.username, u.avatar,
             COALESCE(SUM(v.points_earned), 0) AS room_points,
             COUNT(v.id)                        AS correct_votes,
             COUNT(v.id)                        AS total_votes
      FROM room_members rm
      JOIN users u ON rm.user_id = u.id
      LEFT JOIN votes v ON u.id = v.user_id
      WHERE rm.room_id = ?
      GROUP BY u.id
      ORDER BY room_points DESC
    `, [req.params.roomId]);
    res.json({ success: true, scores: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getMyScores, getLeaderboard, getRoomScores };
