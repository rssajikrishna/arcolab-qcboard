const express = require('express');
const router = express.Router();
const { getDeliveryData, updateDeliveryDay } = require('../controller/deliveryController');

router.get('/', getDeliveryData);
router.post('/update', updateDeliveryDay);

module.exports = router;
