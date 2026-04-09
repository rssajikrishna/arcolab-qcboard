const DeliveryModel = require('../models/Delivery');

const emptyDay = (i) => ({
  date: i + 1,
  planned: null, actual: null, performance: null,
  equipmentBreakdown: null, delayedPBRMinutes: null, delayedPMQCMinutes: null,
  isHoliday: false,
});

const getDeliveryData = async (req, res) => {
  try {
    const { month, year, dept, shift } = req.query;
    const query = { month, year: Number(year), dept: dept || 'DELIVERY', shift: shift || '1' };
    const record = await DeliveryModel.findOne(query);
    if (!record) return res.status(200).json({ days: [] });
    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateDeliveryDay = async (req, res) => {
  try {
    const {
      month, year, dept, shift, date,
      planned, actual,
      equipmentBreakdown, delayedPBRMinutes, delayedPMQCMinutes,
      isHoliday,
    } = req.body;

    if (!month || !year || !date) {
      return res.status(400).json({ message: 'Missing required fields: month, year, date' });
    }

    // Calculate performance (1 decimal place)
    let performance = null;
    if (planned > 0 && actual != null) {
      performance = Math.round((actual / planned) * 1000) / 10;
    }

    const filter = { month, year: Number(year), dept: dept || 'DELIVERY', shift: shift || '1' };
    let record = await DeliveryModel.findOne(filter);

    if (!record) {
      const initialDays = Array.from({ length: 31 }, (_, i) => emptyDay(i));
      record = new DeliveryModel({ ...filter, days: initialDays });
    }

    const dayIndex = record.days.findIndex(d => d.date === Number(date));
    if (dayIndex === -1) {
      return res.status(400).json({ message: `Invalid date: ${date}` });
    }

    record.days[dayIndex] = {
      date:               Number(date),
      planned:            planned            ?? null,
      actual:             actual             ?? null,
      performance,
      equipmentBreakdown: equipmentBreakdown ?? null,
      delayedPBRMinutes:  delayedPBRMinutes  ?? null,
      delayedPMQCMinutes: delayedPMQCMinutes ?? null,
      isHoliday:          isHoliday          || false,
    };

    await record.save();
    res.status(200).json({ message: 'Updated successfully', record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDeliveryData, updateDeliveryDay };
