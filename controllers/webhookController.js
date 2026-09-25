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
  // YEH NAYI LINE DAALNI HAI:
  console.log("🔥 WEBHOOK RECEIVED 🔥\n", JSON.stringify(req.body, null, 2));

  const { object, entry } = req.body;
  if (object !== 'whatsapp_business_account') return res.sendStatus(404);

  const changes = entry?.[0]?.changes?.[0]?.value;
  if (!changes) return res.sendStatus(200);

  const receiverPhone = changes.metadata?.display_phone_number;

  // Incoming Messages - Alag try/catch
  if (changes.messages?.[0]) {
    try {
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
      console.log('New message saved:', msg.id);
    } catch (err) {
      if (err.code === 11000) {
        console.log('Duplicate message ignored:', changes.messages[0].id);
      } else {
        console.error('Message save error:', err.message);
      }
    }
  }

  // Status Updates - Alag try/catch
  if (changes.statuses?.[0]) {
    try {
      const statusEvent = changes.statuses[0];
      console.log('STATUS AAYA:', statusEvent.status, 'ID:', statusEvent.id);

      const updatedMessage = await Message.findOneAndUpdate(
        { messageId: statusEvent.id },
        { status: statusEvent.status },
        { new: true }
      );

      console.log('DB UPDATE HUA?', updatedMessage ? 'HAAN' : 'NAHI');

      if (updatedMessage) {
        req.io.emit('message_status_update', {
          messageId: statusEvent.id,
          status: statusEvent.status,
          updatedMessage
        });
      }
    } catch (err) {
      console.error('Status update error:', err.message);
    }
  }

  // HAMESHA 200 bhejo taaki Meta webhook band na kare!
  res.sendStatus(200);
};

module.exports = { verifyWebhook, handleWebhookEvents };
