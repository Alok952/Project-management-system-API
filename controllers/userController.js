const User = require('../models/User');
const { validationResult } = require('express-validator');

// @route   GET api/users
// @desc    Get all users
// @access  Private (Admin/Manager)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private (Admin/Manager/Self)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if user is requesting own info or has admin/manager role
    if (
      req.user.id !== req.params.id && 
      !['admin', 'manager'].includes(req.user.role)
    ) {
      return res.status(403).json({ msg: 'Not authorized to view this user' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.status(500).send('Server error');
  }
};

// @route   PUT api/users/:id
// @desc    Update user
// @access  Private (Admin/Self)
exports.updateUser = async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Extract fields to update
  const { name, email, role } = req.body;
  
  // Build user object
  const userFields = {};
  if (name) userFields.name = name;
  if (email) userFields.email = email;
  
  // Only admin can update roles
  if (role && req.user.role === 'admin') {
    userFields.role = role;
  }

  try {
    let user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if user is updating own info or is admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized to update this user' });
    }

    // Update user
    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: userFields },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.status(500).send('Server error');
  }
};

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Private (Admin/Self)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if user is deleting own account or is admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized to delete this user' });
    }

    await User.findByIdAndRemove(req.params.id);

    res.json({ msg: 'User removed' });
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.status(500).send('Server error');
  }
};
