const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

// Update user — Admin or Self
router.put(
  '/updateUser/:id',
  [
    auth,
    [
      check('name', 'Name is required').optional(),
      check('email', 'Please include a valid email').optional().isEmail()
    ]
  ],
  userController.updateUser
);

// Get user by ID — Admin/Manager/Self
router.get('/user/:id', auth, userController.getUserById);

// Delete user — Admin or Self
router.delete('/deleteUser/:id', auth, userController.deleteUser);

// Get all users — Admin or Manager
router.get('/allUsers', auth, authorize('admin', 'manager'), userController.getUsers);

module.exports = router;
