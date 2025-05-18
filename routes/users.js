const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

//   GET api/users

router.get('/', auth, authorize('admin', 'manager'), userController.getUsers);


//     Get user by ID
//   Private (Admin/Manager/Self)
router.get('/:id', auth, userController.getUserById);


//    Update user
//  Private (Admin/Self)
router.put(
  '/:id',
  [
    auth,
    [
      check('name', 'Name is required').optional(),
      check('email', 'Please include a valid email').optional().isEmail()
    ]
  ],
  userController.updateUser
);


//   Delete user
//   Private (Admin/Self)
router.delete('/:id', auth, userController.deleteUser);

module.exports = router;
