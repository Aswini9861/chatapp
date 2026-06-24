import mongoose from "mongoose";
import dotenv from 'dotenv'
import 'colors';
import Message from "../model/messageModel.js";
dotenv.config()

const ConnectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL);
    await Message.createIndexes([
      { senderId: 1, receiverId: 1, timestamp: -1 },
      { receiverId: 1, senderId: 1, timestamp: -1 }
    ]);
    console.log(
      `Connect to mongoose database ${conn.connection.host}`.bgMagenta.white
    );
  } catch (error) {
    console.log(`Error in mongodb ${error}`.bgRed.white);
  }
};


export default ConnectDB