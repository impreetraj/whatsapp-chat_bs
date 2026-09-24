const Message = require('../models/messageModel');

// GET /webhook - WhatsApp verification
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Bad Request');
  }
};

// POST /webhook - Receive messages and status updates
const handleWebhookEvents = async (req, res) => {
  try {
    const body = req.body;

    // Check if it's an event from WhatsApp API
    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value
      ) {
        const value = body.entry[0].changes[0].value;
        const metadata = value.metadata;
        const receiverPhone = metadata.display_phone_number;

        // Handle incoming messages
        if (value.messages && value.messages[0]) {
          const message = value.messages[0];
          const senderPhone = message.from;
          const messageId = message.id;
          let textContent = '';

          if (message.type === 'text') {
            textContent = message.text.body;
          }

          // Save to MongoDB
          const newMessage = await Message.create({
            messageId,
            senderPhone,
            receiverPhone,
            textContent,
            status: 'sent',
            timestamp: new Date(message.timestamp * 1000)
          });

          // Emit event to Flutter app via Socket.io
          req.io.emit('new_message', newMessage);
          console.log(`New message saved and emitted: ${messageId}`);
        }

        // Handle status updates (delivered, read)
        if (value.statuses && value.statuses[0]) {
          const statusEvent = value.statuses[0];
          const messageId = statusEvent.id;
          const status = statusEvent.status; // 'delivered', 'read', 'sent'

          // Update message status in MongoDB
          const updatedMessage = await Message.findOneAndUpdate(
            { messageId },
            { status },
            { new: true }
          );

          if (updatedMessage) {
            // Emit status update event
            req.io.emit('status_update', {
              messageId,
              status,
              updatedMessage
            });
            console.log(`Message status updated to ${status} for ID: ${messageId}`);
          }
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.sendStatus(500);
  }
};

module.exports = {
  verifyWebhook,
  handleWebhookEvents
};
