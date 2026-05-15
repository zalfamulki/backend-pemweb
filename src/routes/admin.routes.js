const router = require('express').Router();
const ctrl   = require('../controllers/admin.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

router.get('/stats',             verifyAdmin, ctrl.getDashboardStats);
router.get('/users',             verifyAdmin, ctrl.manageUsers);
router.put('/users/:id/role',    verifyAdmin, ctrl.changeUserRole);
router.delete('/users/:id',      verifyAdmin, ctrl.deleteUser);
router.get('/messages',          verifyAdmin, ctrl.getAllMessages);
router.delete('/messages/:id',   verifyAdmin, ctrl.deleteMessage);

module.exports = router;
