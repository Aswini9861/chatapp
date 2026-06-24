import express from 'express'
import { getChats } from '../controller/chatController.js';

const router = express.Router();


router.get('/recent/:userId',getChats)

export default router
