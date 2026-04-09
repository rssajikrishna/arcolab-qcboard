const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Valid new department names
// QC & Microbiology & AD Lab | Raw Material Warehouse | Packing Material Warehouse
// Finished Good Material Warehouse | Production | Primary Packing Production
// Secondary Packing Production | Post Production | Facilities
// Also kept: legacy short codes Q, D, S, H, I and ALL/NONE for system use

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  employeeId: {
    type: String,
    required: [true, 'Please add an Employee ID'],
    unique: true,
    uppercase: true,
    trim: true
  },
  gmail: {
    type: String,
    required: [true, 'Please add a Gmail address'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please use a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['superadmin', 'hod', 'supervisor', 'employee', 'user'],
    default: 'user',
    lowercase: true
  },
  // Stored as comma-separated string for multi-value support.
  // e.g. "QC & Microbiology & AD Lab,Production" or legacy "Q"
  department: {
    type: String,
    default: 'NONE',
    trim: true
  },
  // Stored as comma-separated string, e.g. "1,2" or "1"
  shift: {
    type: String,
    default: 'NONE',
    trim: true
  },
  dob: {
    type: Date
  }
}, {
  timestamps: true
});

// --- ENCRYPTION MIDDLEWARE ---
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw new Error(err);
  }
});

// --- PASSWORD MATCHING METHOD ---
UserSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
