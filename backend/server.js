import express from "express";
import dotenv from 'dotenv'
import bodyParser from 'express'
import cors from 'cors'
import ConnectDB from "./config/db.js";
import authrouter from "./routes/authroutes.js"
import userrouter from "./routes/userroutes.js"
import http from 'http'
import messagerouter from "./routes/messageroutes.js"
import chatrouter from "./routes/chatroutes.js"
import redisrouter from "./routes/redisroutes.js"
import cookieParser from "cookie-parser";
import { setupWebSocket } from "./config/ws.js";



const PORT = process.env.PORT || 8989
const app =express()
const serverHttp = http.createServer(app);
app.use(cookieParser())
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use('/api/v1/auth',authrouter)
app.use('/api/v1/user',userrouter)
app.use("/api/v1/messages",messagerouter);
app.use("/api/v1/chats",chatrouter);
app.use("/api/v1/redis",redisrouter);



ConnectDB()


app.use(bodyParser.json());
dotenv.config()


app.get('/',(req,res)=>{
    res.send('hello world')
})


serverHttp.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`.bgCyan.white);
setupWebSocket(serverHttp)

  });