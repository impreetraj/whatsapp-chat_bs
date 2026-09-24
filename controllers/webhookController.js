const Message = require('../models/Message');

const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};

const handleWebhookEvents = async (req, res) => {
  try {
    const { object, entry } = req.body;
    if (object !== 'whatsapp_business_account') return res.sendStatus(404);

    const changes = entry?.[0]?.changes?.[0]?.value;
    if (!changes) return res.sendStatus(200);

    const receiverPhone = changes.metadata?.display_phone_number;

  
    if (changes.messages?.[0]) {
      const msg = changes.messages[0];
      const textContent = msg.type === 'text' ? msg.text.body : '';

      const newMessage = await Message.create({
        messageId: msg.id,
        senderPhone: msg.from,
        receiverPhone,
        textContent,
        status: 'sent',
        timestamp: new Date(msg.timestamp * 1000)
      });

      req.io.emit('new_message', newMessage);
    }


    if (changes.statuses?.[0]) {
      const statusEvent = changes.statuses[0];
      
      const updatedMessage = await Message.findOneAndUpdate(
        { messageId: statusEvent.id },
        { status: statusEvent.status },
        { new: true }
      );

      if (updatedMessage) {
        req.io.emit('message_status_update', {
          messageId: statusEvent.id,
          status: statusEvent.status,
          updatedMessage
        });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
};

module.exports = { verifyWebhook, handleWebhookEvents };
