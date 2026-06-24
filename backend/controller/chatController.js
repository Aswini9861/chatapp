import ChatModel from "../model/ChatModel.js";

export const getChats = async(request,response)=>{
  try {
    const { userId } = request.params;

    // Find all chats where userId is involved
    const chats = await ChatModel.find({
      $or: [{ user1: userId }, { user2: userId }],
    }).populate("user1", "username email")
    .populate("user2", "username email");


    // Extract the chat partner (not the logged-in user)
    const formattedChats = chats.map((chat) =>
      chat.user1._id.toString() === userId ? chat.user2 : chat.user1
    );

    response.json({ success: true, chats: formattedChats });
  } catch (error) {
    response.status(500).json({ success: false, message: "Error fetching chats" });
  }
}