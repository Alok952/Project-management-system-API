const Project = require('../models/Project');
const Task = require('../models/Task');
const { validationResult } = require('express-validator');

//   GET api/projects
//    Get all projects
//  Private
exports.getProjects = async (req, res) => {
  try {
    // Different behavior based on user role
    let projects;
    
    if (req.user.role === 'admin') {
      // Admin can see all projects
      projects = await Project.find()
        .populate('manager', 'name email')
        .populate('team', 'name email');
    } else if (req.user.role === 'manager') {
      // Manager can see projects they manage or are part of the team
      projects = await Project.find({
        $or: [
          { manager: req.user.id },
          { team: req.user.id }
        ]
      })
        .populate('manager', 'name email')
        .populate('team', 'name email');
    } else {
      // Regular members can only see projects they are part of
      projects = await Project.find({ team: req.user.id })
        .populate('manager', 'name email')
        .populate('team', 'name email');
    }
    
    res.json(projects);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

//   GET api/projects/:id
//   Get project by ID
//  Private
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'name email')
      .populate('team', 'name email');
    
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    // Check if user is authorized to view this project
    const isAdmin = req.user.role === 'admin';
    const isManager = req.user.id === project.manager.id;
    const isTeamMember = project.team.some(member => member.id === req.user.id);
    
    if (!isAdmin && !isManager && !isTeamMember) {
      return res.status(403).json({ msg: 'Not authorized to view this project' });
    }

    res.json(project);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project not found' });
    }
    
    res.status(500).send('Server error');
  }
};


//   Create a project
//   Private (Admin/Manager)
exports.createProject = async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    name,
    description,
    manager,
    team,
    status,
    startDate,
    endDate
  } = req.body;

  try {
    // Only admin and managers can create projects
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ msg: 'Not authorized to create projects' });
    }

    // Create project
    const project = new Project({
      name,
      description,
      manager: manager || req.user.id,  
      team: team || [],
      status,
      startDate,
      endDate
    });

    await project.save();
    
    // Populate manager and team before sending response
    const populatedProject = await Project.findById(project._id)
      .populate('manager', 'name email')
      .populate('team', 'name email');

    res.json(populatedTask);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};


exports.updateProject = async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    name,
    description,
    manager,
    team,
    status,
    startDate,
    endDate
  } = req.body;

  try {
    let project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    // Check if user is authorized to update this project
    const isAdmin = req.user.role === 'admin';
    const isManager = req.user.id === project.manager.toString();
    
    if (!isAdmin && !isManager) {
      return res.status(403).json({ msg: 'Not authorized to update this project' });
    }

    // Build project object
    const projectFields = {};
    if (name) projectFields.name = name;
    if (description) projectFields.description = description;
    if (manager) projectFields.manager = manager;
    if (team) projectFields.team = team;
    if (status) projectFields.status = status;
    if (startDate) projectFields.startDate = startDate;
    if (endDate) projectFields.endDate = endDate;

    // Update project
    project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: projectFields },
      { new: true }
    )
      .populate('manager', 'name email')
      .populate('team', 'name email');

    res.json(project);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project not found' });
    }
    
    res.status(500).send('Server error');
  }
};



exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    // Check if user is authorized to delete this project
    const isAdmin = req.user.role === 'admin';
    const isManager = req.user.id === project.manager.toString();
    
    if (!isAdmin && !isManager) {
      return res.status(403).json({ msg: 'Not authorized to delete this project' });
    }

    // Delete all associated tasks first
    await Task.deleteMany({ project: req.params.id });
    
    // Delete the project
    await Project.findByIdAndRemove(req.params.id);

    res.json({ msg: 'Project and associated tasks removed' });
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project not found' });
    }
    
    res.status(500).send('Server error');
  }
};

exports.addTeamMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    // Check if user is authorized to update this project
    const isAdmin = req.user.role === 'admin';
    const isManager = req.user.id === project.manager.toString();
    
    if (!isAdmin && !isManager) {
      return res.status(403).json({ msg: 'Not authorized to update this project' });
    }

    const { userId } = req.body;
    
    // Check if member already exists
    if (project.team.some(member => member.toString() === userId)) {
      return res.status(400).json({ msg: 'User already in team' });
    }

    // Add to team
    project.team.push(userId);
    await project.save();

    // Populate before sending response
    const updatedProject = await Project.findById(req.params.id)
      .populate('manager', 'name email')
      .populate('team', 'name email');

    res.json(updatedProject);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project or user not found' });
    }
    
    res.status(500).send('Server error');
  }
};


exports.removeTeamMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    // Check if user is authorized to update this project
    const isAdmin = req.user.role === 'admin';
    const isManager = req.user.id === project.manager.toString();
    
    if (!isAdmin && !isManager) {
      return res.status(403).json({ msg: 'Not authorized to update this project' });
    }

    // Check if member exists
    if (!project.team.some(member => member.toString() === req.params.userId)) {
      return res.status(400).json({ msg: 'User not in team' });
    }

   
    project.team = project.team.filter(member => member.toString() !== req.params.userId);
    await project.save();

    
    const updatedProject = await Project.findById(req.params.id)
      .populate('manager', 'name email')
      .populate('team', 'name email');

    res.json(updatedProject);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project or user not found' });
    }
    
    res.status(500).send('Server error');
  }
};

