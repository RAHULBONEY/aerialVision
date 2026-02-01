const admin = require("firebase-admin");
const { db } = require("../config/firebase");

const CHATS_COLLECTION = "chats";
const MESSAGES_SUBCOLLECTION = "messages";


exports.findOrCreateChat = async (uid1, uid2) => {
 
  const participants = [uid1, uid2].sort();

  // Check if chat already exists
  const existingChat = await db
    .collection(CHATS_COLLECTION)
    .where("participants", "==", participants)
    .limit(1)
    .get();

  if (!existingChat.empty) {
    const doc = existingChat.docs[0];
    return { chatId: doc.id, ...doc.data() };
  }

 
  const newChatRef = db.collection(CHATS_COLLECTION).doc();
  const chatData = {
    chatId: newChatRef.id,
    participants,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastMessage: null,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await newChatRef.set(chatData);

  return { chatId: newChatRef.id, ...chatData };
};


exports.getById = async (chatId) => {
  const doc = await db.collection(CHATS_COLLECTION).doc(chatId).get();

  if (!doc.exists) {
    return null;
  }

  return { chatId: doc.id, ...doc.data() };
};


exports.getUserChats = async (uid) => {
  const snapshot = await db
    .collection(CHATS_COLLECTION)
    .where("participants", "array-contains", uid)
    .orderBy("lastUpdatedAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    chatId: doc.id,
    ...doc.data(),
  }));
};


exports.isParticipant = async (chatId, uid) => {
  const chat = await exports.getById(chatId);
  if (!chat) return false;
  return chat.participants.includes(uid);
};


exports.getMessages = async (chatId, limit = 50) => {
  const snapshot = await db
    .collection(CHATS_COLLECTION)
    .doc(chatId)
    .collection(MESSAGES_SUBCOLLECTION)
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    messageId: doc.id,
    ...doc.data(),
  }));
};


exports.addMessage = async (chatId, senderId, senderName, text) => {
  const messageRef = db
    .collection(CHATS_COLLECTION)
    .doc(chatId)
    .collection(MESSAGES_SUBCOLLECTION)
    .doc();

  const messageData = {
    messageId: messageRef.id,
    chatId,
    senderId,
    senderName,
    text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  
  const batch = db.batch();

  batch.set(messageRef, messageData);

  
  const chatRef = db.collection(CHATS_COLLECTION).doc(chatId);
  batch.update(chatRef, {
    lastMessage: text.substring(0, 100), 
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return messageData;
};
