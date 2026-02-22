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

// auth the user 
router.use(authenticateToken);
router.use(requireRole(ROLES.POLICE_AND_ADMIN));

// Chat routes
router.post("/", createOrGetChat);   //for the state         
router.get("/", getUserChats);          //particular chat      
router.get("/:chatId", getChat);             //get chat
router.get("/:chatId/messages", getMessages); // get msg
router.post("/:chatId/messages", sendMessage);//send msg

module.exports = router;
