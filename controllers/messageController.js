const axios = require('axios');
const Message = require('../models/messageModel');

const sendMessage = async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message are required' });
  }

  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const metaAccessToken = process.env.META_ACCESS_TOKEN;
  // senderPhone can be configured in your .env or hardcoded for testing
  const senderPhone = process.env.SENDER_PHONE || 'YOUR_TEST_NUMBER'; 

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { preview_url: false, body: message }
    };

    const config = {
      headers: {
        Authorization: `Bearer ${metaAccessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await axios.post(url, payload, config);

    if (response.data && response.data.messages && response.data.messages.length > 0) {
      const messageId = response.data.messages[0].id;

      // Save to MongoDB
      const newMessage = await Message.create({
        messageId,
        senderPhone,
        receiverPhone: phone,
        textContent: message,
        status: 'sent',
        timestamp: new Date()
      });

      return res.status(200).json({ success: true, data: newMessage });
    } else {
      return res.status(500).json({ error: 'Failed to extract message ID from WhatsApp API response' });
    }

  } catch (error) {
    console.error('Error sending message via WhatsApp API:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to send message', details: error.response?.data || error.message });
  }
};

module.exports = {
  sendMessage
};
