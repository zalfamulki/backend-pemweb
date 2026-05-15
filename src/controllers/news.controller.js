const db = require('../config/db');

// GET /api/news  — list all published news
const getAllNews = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT n.*, u.username AS created_by_name,
             COUNT(v.id) AS total_votes,
             SUM(CASE WHEN v.vote = 'fact' THEN 1 ELSE 0 END)  AS fact_votes,
             SUM(CASE WHEN v.vote = 'hoax' THEN 1 ELSE 0 END)  AS hoax_votes
      FROM news n
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN votes v ON n.id = v.news_id
      WHERE n.status = 'published'
      GROUP BY n.id
      ORDER BY n.created_at DESC
    `);
    res.json({ success: true, news: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/news/:id
const getNewsById = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT n.*, u.username AS created_by_name,
             COUNT(v.id) AS total_votes,
             SUM(CASE WHEN v.vote = 'fact' THEN 1 ELSE 0 END)  AS fact_votes,
             SUM(CASE WHEN v.vote = 'hoax' THEN 1 ELSE 0 END)  AS hoax_votes
      FROM news n
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN votes v ON n.id = v.news_id
      WHERE n.id = ?
      GROUP BY n.id
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'News not found' });
    res.json({ success: true, news: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/news  — admin only
const createNews = async (req, res) => {
  try {
    const { title, content, category, image_url, is_hoax, explanation, difficulty } = req.body;
    const [result] = await db.execute(
      `INSERT INTO news (title, content, category, image_url, is_hoax, explanation, difficulty, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
      [title, content, category, image_url || null, is_hoax ? 1 : 0, explanation, difficulty || 'medium', req.user.id]
    );
    res.status(201).json({ success: true, message: 'News created', newsId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/news/:id
const updateNews = async (req, res) => {
  try {
    const { title, content, category, image_url, is_hoax, explanation, difficulty, status } = req.body;
    await db.execute(
      `UPDATE news SET title=?, content=?, category=?, image_url=?, is_hoax=?, explanation=?, difficulty=?, status=? WHERE id=?`,
      [title, content, category, image_url || null, is_hoax ? 1 : 0, explanation, difficulty, status, req.params.id]
    );
    res.json({ success: true, message: 'News updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/news/:id
const deleteNews = async (req, res) => {
  try {
    await db.execute('DELETE FROM news WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'News deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/news/:id/vote  — player votes fact or hoax
const voteNews = async (req, res) => {
  try {
    const { vote } = req.body; // 'fact' | 'hoax'
    const userId = req.user.id;
    const newsId = req.params.id;

    // Check already voted
    const [existing] = await db.execute('SELECT id FROM votes WHERE user_id = ? AND news_id = ?', [userId, newsId]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Already voted on this news' });
    }

    // Get correct answer
    const [newsRows] = await db.execute('SELECT is_hoax, difficulty FROM news WHERE id = ?', [newsId]);
    if (newsRows.length === 0) return res.status(404).json({ success: false, message: 'News not found' });

    const news = newsRows[0];
    const correctAnswer = news.is_hoax ? 'hoax' : 'fact';
    const isCorrect = vote === correctAnswer;

    const pointsMap = { easy: 10, medium: 20, hard: 40 };
    const points = isCorrect ? (pointsMap[news.difficulty] || 20) : -5;

    await db.execute(
      'INSERT INTO votes (user_id, news_id, vote, is_correct, points_earned) VALUES (?, ?, ?, ?, ?)',
      [userId, newsId, vote, isCorrect ? 1 : 0, points]
    );

    // Update trust_score & reputation
    await db.execute(
      'UPDATE users SET reputation = reputation + ?, trust_score = LEAST(GREATEST(trust_score + ?, 0), 200) WHERE id = ?',
      [Math.max(points, 0), points, userId]
    );

    res.json({
      success: true,
      isCorrect,
      correctAnswer,
      pointsEarned: points,
      explanation: news.explanation || ''
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/news/:id/votes
const getVotes = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT v.*, u.username, u.avatar FROM votes v
      JOIN users u ON v.user_id = u.id
      WHERE v.news_id = ?
      ORDER BY v.created_at DESC
    `, [req.params.id]);
    res.json({ success: true, votes: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllNews, getNewsById, createNews, updateNews, deleteNews, voteNews, getVotes };
