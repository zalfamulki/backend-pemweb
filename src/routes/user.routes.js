const router = require('express').Router();
const ctrl   = require('../controllers/user.controller');
const { verifyToken, verifyAdmin } = require('../middleware/auth.middleware');

router.get('/leaderboard', ctrl.getLeaderboard);
router.get('/online',      verifyToken, ctrl.getOnlineUsers);
router.get('/',            verifyAdmin, ctrl.getAllUsers);
router.get('/:id',         verifyToken, ctrl.getUserById);
router.put('/profile',     verifyToken, ctrl.updateProfile);

module.exports = router;
