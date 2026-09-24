const express = require('express');
const router = express.Router();
const { verifyWebhook, handleWebhookEvents } = require('../controllers/webhookController');

// GET /webhook for WhatsApp verification
router.get('/', verifyWebhook);

// POST /webhook to receive messages and status updates
router.post('/', handleWebhookEvents);

module.exports = router;
