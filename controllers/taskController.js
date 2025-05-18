const Task = require('../models/Task');
const Project = require('../models/Project');
const { validationResult } = require('express-validator');

// @route   GET api/tasks
// @desc    Get all tasks (filtered by query params)
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    // Extract query parameters for filtering
    const { project, assignedTo, status, priority } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (project) filter.project = project;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    
    // Handle assignedTo filter
    if (assignedTo === 'me') {
      filter.assignedTo = req.user.id;
    } else if (assignedTo === 'unassigned') {
      filter.assignedTo = { $exists: false };
    } else if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    // Different behavior based on user role
    if (req.user.role !== 'admin') {
      // Non-admin users can only see tasks from projects they are part of
      const accessibleProjects = await Project.find({
        $or: [
          { manager: req.user.id },
          { team: req.user.id }
        ]
      }).select('_id');
      
      const projectIds = accessibleProjects.map(p => p._id);
      
      // Add project filter for non-admin
      filter.project = { $in: projectIds };
      
      // If a specific project was requested, check it's in accessible projects
      if (project && !projectIds.some(id => id.toString() === project)) {
        return res.status(403).json({ msg: 'Not authorized to access tasks from this project' });
      }
    }

    // Get tasks with filter
    const tasks = await Task.find(filter)
      .populate('project', 'name')
      .populate('assignedTo', 'name email');
    
    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/tasks/:id
// @desc    Get task by ID
// @access  Private
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name manager team')
      .populate('assignedTo', 'name email');
    
    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }

    // Check if user is authorized to view this task
    const isAdmin = req.user.role === 'admin';
    const isManager = task.project.manager.toString() === req.user.id;
    const isTeamMember = task.project.team.some(member => member.toString() === req.user.id);
    const isAssigned = task.assignedTo && task.assignedTo._id.toString() === req.user.id;
    
    if (!isAdmin && !isManager && !isTeamMember && !isAssigned) {
      return res.status(403).json({ msg: 'Not authorized to view this task' });
    }

    res.json(task);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Task not found' });
    }
    
    res.status(500).send('Server error');
  }
};

// @route   POST api/tasks
// @desc    Create a task
// @access  Private
exports.createTask = async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title,
    description,
    project,
    assignedTo,
    status,
    priority,
    dueDate
  } = req.body;

  try {
    // Check if project exists
    const projectObj = await Project.findById(project);

    if (!projectObj) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    // Check if user is authorized to add tasks to this project
    const isAdmin = req.user.role === 'admin';
    const isManager = projectObj.manager.toString() === req.user.id;
    const isTeamMember = projectObj.team.some(
      member => member.toString() === req.user.id
    );

    if (!isAdmin && !isManager && !isTeamMember) {
      return res.status(403).json({ msg: 'Not authorized to add tasks to this project' });
    }

    // Create task
    const task = new Task({
      title,
      description,
      project,
      assignedTo,
      status,
      priority,
      dueDate,
      createdBy: req.user.id
    });

    await task.save();

    // Populate related fields before sending response
    const populatedTask = await Task.findById(task._id)
      .populate('project', 'name')
      .populate('assignedTo', 'name email');

    res.json(populatedTask);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateTask = async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title,
    description,
    assignedTo,
    status,
    priority,
    dueDate
  } = req.body;

  try {
    let task = await Task.findById(req.params.id).populate('project', 'manager team');
    
    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }

    // Check if user is authorized to update this task
    const isAdmin = req.user.role === 'admin';
    const isManager = task.project.manager.toString() === req.user.id;
    const isTeamMember = task.project.team.some(member => member.toString() === req.user.id);
    const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user.id;
    
    if (!isAdmin && !isManager && !isTeamMember && !isAssigned) {
      return res.status(403).json({ msg: 'Not authorized to update this task' });
    }

    // Build task object
    const taskFields = {};
    if (title) taskFields.title = title;
    if (description) taskFields.description = description;
    if (assignedTo) taskFields.assignedTo = assignedTo;
    if (status) taskFields.status = status;
    if (priority) taskFields.priority = priority;
    if (dueDate) taskFields.dueDate = dueDate;

    // Update task
    task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: taskFields },
      { new: true }
    )
      .populate('project', 'name')
      .populate('assignedTo', 'name email');

    res.json(task);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Task not found' });
    }
    
    res.status(500).send('Server error');
  }
};

// @route   DELETE api/tasks/:id
// @desc    Delete task
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project', 'manager team');
    
    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }

    // Check if user is authorized to delete this task
    const isAdmin = req.user.role === 'admin';
    const isManager = task.project.manager.toString() === req.user.id;
    
    // Only admin and project manager can delete tasks
    if (!isAdmin && !isManager) {
      return res.status(403).json({ msg: 'Not authorized to delete this task' });
    }

    await Task.findByIdAndRemove(req.params.id);

    res.json({ msg: 'Task removed' });
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Task not found' });
    }
    
    res.status(500).send('Server error');
  }
};