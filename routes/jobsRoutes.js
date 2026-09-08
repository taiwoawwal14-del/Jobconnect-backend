const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

// GET /api/jobs - list all jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).populate('poster', 'fullName username avatar');
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs - create a job
router.post('/', async (req, res) => {
  try {
    const {
      title,
      company,
      description,
      salary,
      location,
      workType,
      paymentFrequency,
      requirements,
      poster,
    } = req.body;

    if (!title || !description || !salary || !location || !workType || !paymentFrequency || !requirements) {
      return res.status(400).json({ error: 'Please fill out all job details.' });
    }

    const job = new Job({
      title: String(title).trim(),
      company: String(company || 'Company').trim(),
      description: String(description).trim(),
      salary: String(salary).trim(),
      location: String(location).trim(),
      workType: String(workType).trim(),
      paymentFrequency: String(paymentFrequency).trim(),
      requirements: String(requirements).trim(),
      poster: poster || null,
    });

    await job.save();
    await job.populate('poster', 'fullName username avatar');
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:id - delete a job by id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findByIdAndDelete(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
