const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');


//    Get all tasks (filtered by query params)
//   Private
router.get('/', auth, taskController.getTasks);


//    Get task by ID

router.get('/taskById/:id', auth, taskController.getTaskById);


//   Create a task

router.post(
  '/assignTask',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('project', 'Project is required').not().isEmpty()
    ]
  ],
  taskController.createTask
);


//    Update task
//   Private
router.put('/update/:id',  auth,taskController.updateTask);


//    Delete task
//  Private
router.delete('/deleteTask/:id', auth, taskController.deleteTask);

module.exports = router;