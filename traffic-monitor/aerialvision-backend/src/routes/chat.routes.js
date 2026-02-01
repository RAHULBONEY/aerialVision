const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { requireRole, ROLES } = require("../middleware/rbac");
const {
  createOrGetChat,
  getUserChats,
  getChat,
  getMessages,
  sendMessage,
} = require("../controllers/chat.controller");

// All routes require authentication and TRAFFIC_POLICE role
router.use(authenticateToken);
router.use(requireRole(ROLES.POLICE_AND_ADMIN));

// Chat routes
router.post("/", createOrGetChat);           // Create or get chat
router.get("/", getUserChats);               // Get all user's chats
router.get("/:chatId", getChat);             // Get chat metadata
router.get("/:chatId/messages", getMessages); // Get messages
router.post("/:chatId/messages", sendMessage); // Send message

module.exports = router;
