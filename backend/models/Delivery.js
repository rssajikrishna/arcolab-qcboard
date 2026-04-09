const mongoose = require('mongoose');

const deliveryDaySchema = new mongoose.Schema({
  date:               { type: Number, required: true },
  // Major metrics
  planned:            { type: Number, default: null },
  actual:             { type: Number, default: null },
  performance:        { type: Number, default: null }, // calculated: actual/planned*100
  // Minor metrics
  equipmentBreakdown: { type: Number, default: null }, // count; 0=green, >0=red
  delayedPBRMinutes:  { type: Number, default: null }, // minutes deviated; <=30=green, >30=red
  delayedPMQCMinutes: { type: Number, default: null }, // minutes deviated; <=30=green, >30=red
  isHoliday:          { type: Boolean, default: false },
}, { _id: false });

const deliverySchema = new mongoose.Schema({
  month: { type: String, required: true },
  year:  { type: Number, required: true },
  dept:  { type: String, default: 'DELIVERY' },
  shift: { type: String, default: '1' },
  days:  [deliveryDaySchema],
}, { timestamps: true });

deliverySchema.index({ month: 1, year: 1, dept: 1, shift: 1 }, { unique: true });

module.exports = mongoose.model('Delivery', deliverySchema);
