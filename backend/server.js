require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const metricRoutes   = require('./routes/metricRoutes');
const userRoutes     = require('./routes/userRoutes');
const healthRoutes   = require('./routes/healthRoutes');
const ideationRoutes = require('./routes/ideationRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/metrics',   metricRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/health',    healthRoutes);
app.use('/api/ideation',  ideationRoutes);
app.use('/api/delivery',  deliveryRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ Connection Error:', err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));