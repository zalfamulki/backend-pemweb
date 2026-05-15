const router = require('express').Router();
const ctrl   = require('../controllers/score.controller');
const { verifyToken, verifyAdmin } = require('../middleware/auth.middleware');

router.get('/me',              verifyToken, ctrl.getMyScores);
router.get('/leaderboard',     ctrl.getLeaderboard);
router.get('/room/:roomId',    verifyToken, ctrl.getRoomScores);

module.exports = router;
