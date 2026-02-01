const chatService = require("../services/chat.service");

//post if new chat else get existing chat 
exports.createOrGetChat = async (req, res) => {
  try {
    const { participantId } = req.body;
    const currentUserId = req.user.uid;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: "participantId is required",
      });
    }

    if (participantId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot create chat with yourself",
      });
    }

    const chat = await chatService.findOrCreateChat(currentUserId, participantId);

    res.json({
      success: true,
      data: chat,
    });
  } catch (err) {
    console.error("Error creating/getting chat:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create or get chat",
    });
  }
};

//all chats for a user
exports.getUserChats = async (req, res) => {
  try {
    const currentUserId = req.user.uid;
    const chats = await chatService.getUserChats(currentUserId);

    res.json({
      success: true,
      data: chats,
    });
  } catch (err) {
    console.error("Error fetching user chats:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chats",
    });
  }
};

//get particular chat
exports.getChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user.uid;

    // Check if user is participant
    const isParticipant = await chatService.isParticipant(chatId, currentUserId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Not a participant of this chat",
      });
    }

    const chat = await chatService.getById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    res.json({
      success: true,
      data: chat,
    });
  } catch (err) {
    console.error("Error fetching chat:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat",
    });
  }
};

//get messages
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user.uid;

    // Check if user is participant
    const isParticipant = await chatService.isParticipant(chatId, currentUserId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Not a participant of this chat",
      });
    }

    const messages = await chatService.getMessages(chatId);

    res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};

//post for a chat
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;
    const currentUserId = req.user.uid;
    const senderName = req.user.name || "Unknown Officer";

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required",
      });
    }

    //auth user before chat
    const isParticipant = await chatService.isParticipant(chatId, currentUserId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Not a participant of this chat",
      });
    }

    const message = await chatService.addMessage(
      chatId,
      currentUserId,
      senderName,
      text.trim()
    );

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};
