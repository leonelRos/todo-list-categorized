const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  complete: { type: Boolean, default: false }
});

const listSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tasks: [taskSchema]
});

module.exports = mongoose.model("List", listSchema)