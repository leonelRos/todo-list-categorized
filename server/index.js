require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const List = require('./models/List');

const app = express();
app.use(cors());
app.use(express.json());
// serve the frontend (index.html, css, js) from the project root, one level up
app.use(express.static(path.join(__dirname, '..')));

// Get all lists
app.get('/api/lists', async (req, res) => {
  res.json(await List.find());
});

// Create a list
app.post('/api/lists', async (req, res) => {
  const list = await List.create({ name: req.body.name, tasks: [] });
  res.status(201).json(list);
});

// Delete a list
app.delete('/api/lists/:id', async (req, res) => {
  await List.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// Add a task to a list
app.post('/api/lists/:id/tasks', async (req, res) => {
  const list = await List.findById(req.params.id);
  list.tasks.push({ name: req.body.name, complete: false });
  await list.save();
  res.status(201).json(list);
});

// Toggle a task's complete state
app.patch('/api/lists/:listId/tasks/:taskId', async (req, res) => {
  const list = await List.findById(req.params.listId);
  const task = list.tasks.id(req.params.taskId);
  task.complete = req.body.complete;
  await list.save();
  res.json(list);
});

// Clear completed tasks in a list
app.delete('/api/lists/:id/tasks/completed', async (req, res) => {
  const list = await List.findById(req.params.id);
  list.tasks = list.tasks.filter(t => !t.complete);
  await list.save();
  res.json(list);
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Running on http://localhost:${port}`));
  })
  .catch(err => console.error('DB connection error:', err));