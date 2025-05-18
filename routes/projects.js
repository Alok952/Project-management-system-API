const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const projectController = require('../controllers/projectController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

//   Get all projects
//   Private
router.get('/', auth, projectController.getProjects);


//     Get project by ID
//   Private
router.get('/:id', auth, projectController.getProjectById);

//     Create a project
//   Private (Admin/Manager)
router.post(
  '/',
  [
    auth,
    authorize('admin', 'manager'),
    [
      check('name', 'Name is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty()
    ]
  ],
  projectController.createProject
);

//     Update project
//   Private (Admin/Manager)
router.put('/:id', auth, projectController.updateProject);

//     Delete project
//   Private (Admin/Manager)
router.delete('/:id', auth, projectController.deleteProject);

//     Add team member to project
//   Private (Admin/Manager)
router.post(
  '/:id/team',
  [
    auth,
    [
      check('userId', 'User ID is required').not().isEmpty()
    ]
  ],
  projectController.addTeamMember
);

//     Remove team member from project
//   Private (Admin/Manager)
router.delete('/:id/team/:userId', auth, projectController.removeTeamMember);

module.exports = router;