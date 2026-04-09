const express = require('express');
const router = express.Router();

const {
  loginUser,
  registerUser,
  getSupervisors,
  getAllByRole,
  updateSupervisor
} = require('../controller/userController');

// --- AUTH ROUTES ---
router.post('/login', loginUser);
router.post('/register', registerUser);

// --- DATA ROUTES ---
router.get('/supervisors/:dept', getSupervisors);          // existing — kept for backward compat
router.get('/all/:role', getAllByRole);                     // NEW: fetch any role
router.put('/update/:id', updateSupervisor);

module.exports = router;
