const express = require('express');
const router = express.Router();

const { verifyWebhook, handleWebhookEvents } = require('../controllers/webhookController');
const { sendMessage, getChats, getChatHistory } = require('../controllers/messageController');

// Webhook Routes
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhookEvents);

// API Routes
router.post('/api/messages/send', sendMessage);
router.get('/api/chats', getChats);
router.get('/api/chats/:phone', getChatHistory);

module.exports = router;
