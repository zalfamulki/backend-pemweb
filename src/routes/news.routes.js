const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl    = require('../controllers/news.controller');
const { verifyToken, verifyAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.get('/',         verifyToken, ctrl.getAllNews);
router.get('/:id',      verifyToken, ctrl.getNewsById);
router.get('/:id/votes',verifyToken, ctrl.getVotes);

router.post('/',
  verifyAdmin,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('is_hoax').isBoolean().withMessage('is_hoax must be boolean'),
    body('explanation').trim().notEmpty().withMessage('Explanation is required'),
    body('difficulty').isIn(['easy','medium','hard']).withMessage('Invalid difficulty')
  ],
  validate,
  ctrl.createNews
);

router.put('/:id',    verifyAdmin, ctrl.updateNews);
router.delete('/:id', verifyAdmin, ctrl.deleteNews);

router.post('/:id/vote',
  verifyToken,
  [body('vote').isIn(['fact','hoax']).withMessage('Vote must be fact or hoax')],
  validate,
  ctrl.voteNews
);

module.exports = router;
