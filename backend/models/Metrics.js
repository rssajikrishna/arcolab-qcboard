const mongoose = require('mongoose');

const IssueLogSchema = new mongoose.Schema({
  date: String,
  rawDate: String,
  reason: String,
  incident: String,
  affected: Number,
  severity: String,
  empId:         { type: String, default: '' },
  deviationType: { type: String, enum: ['none', 'human_error', 'procedural'], default: 'none' },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const ShiftDataSchema = new mongoose.Schema({
  alerts: { type: Number, default: 0 },
  success: { type: Number, default: 0 },
  daysData: [String],
  issueLogs: [IssueLogSchema]
}, { _id: false });

const MetricSchema = new mongoose.Schema({
  letter: { type: String, required: true, unique: true },
  label: String,
  // Top-level fields remain for home overview (existing data untouched)
  alerts: Number,
  success: Number,
  daysData: [String],
  issueLogs: [IssueLogSchema],
  // Per-shift data stored as nested objects
  shifts: {
    '1': { type: ShiftDataSchema, default: () => ({ alerts: 0, success: 0, daysData: [], issueLogs: [] }) },
    '2': { type: ShiftDataSchema, default: () => ({ alerts: 0, success: 0, daysData: [], issueLogs: [] }) },
    '3': { type: ShiftDataSchema, default: () => ({ alerts: 0, success: 0, daysData: [], issueLogs: [] }) },
  }
}, { timestamps: true });

module.exports = mongoose.model('Metric', MetricSchema);
