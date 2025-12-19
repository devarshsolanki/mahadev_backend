const express = require('express');
const AdminController = require('../controllers/adminController');

const router = express.Router();

// Public endpoint to fetch home slider configuration
router.get('/', AdminController.getHomeSliders);

module.exports = router;
