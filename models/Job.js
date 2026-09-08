const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, default: 'Company' },
  description: { type: String, required: true },
  salary: { type: String, default: '' },
  location: { type: String, default: '' },
  workType: { type: String, default: 'Full-time' },
  paymentFrequency: { type: String, default: 'Monthly' },
  requirements: { type: String, default: '' },
  poster: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Job', jobSchema);
