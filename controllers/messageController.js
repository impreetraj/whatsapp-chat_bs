const axios = require('axios');
const Message = require('../models/Message');

const sendMessage = async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'Phone and message required' });

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { preview_url: false, body: message }
      },
      {
        headers: { Authorization: `Bearer ${process.env.META_TOKEN}` }
      }
    );

    const messageId = response.data.messages[0].id;
    const newMessage = await Message.create({
      messageId,
      senderPhone: process.env.MY_PHONE_NUMBER,
      receiverPhone: phone,
      textContent: message,
      status: 'sent',
      timestamp: new Date()
    });

    res.status(200).json({ success: true, data: newMessage });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

const getChats = async (req, res) => {
  try {
    const myPhone = process.env.MY_PHONE_NUMBER;

    const chats = await Message.aggregate([
      { $match: { $or: [{ senderPhone: myPhone }, { receiverPhone: myPhone }] } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: {
            $cond: [ { $eq: ["$senderPhone", myPhone] }, "$receiverPhone", "$senderPhone" ]
          },
          lastMessageDoc: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [ { $eq: ["$receiverPhone", myPhone] }, { $in: ["$status", ["sent", "delivered"]] } ] },
                1, 0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          contactPhone: "$_id",
          lastMessage: "$lastMessageDoc.textContent",
          timestamp: "$lastMessageDoc.timestamp",
          unreadCount: 1
        }
      },
      { $sort: { timestamp: -1 } }
    ]);

    res.status(200).json(chats); // Return direct JSON array as requested
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const { phone } = req.params;
    const myPhone = process.env.MY_PHONE_NUMBER;

    const messages = await Message.find({
      $or: [
        { senderPhone: myPhone, receiverPhone: phone },
        { senderPhone: phone, receiverPhone: myPhone }
      ]
    }).sort({ timestamp: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

module.exports = { sendMessage, getChats, getChatHistory };
