// constants/socketEvents.js
export const SocketEvent = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",

  // Server → client
  NEW_ON_LIST_MESSAGE: "new_on_list_message",
  NEW_MESSAGE_WITH_USER: "new_message_with_user",

  // Client → server
  GET_LIST_MESSAGE: "get_list_message",
  GET_MESSAGES_WITH_USER: "get_messages_with_user",
};
