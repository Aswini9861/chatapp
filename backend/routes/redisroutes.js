import express from 'express'
import { getcachedMessages } from '../controller/redisController.js';

const router = express.Router();

router.get('/getcachedmessages/:userId/:targetId',getcachedMessages)

export default router
