import express from 'express'
import { searchUser } from '../controller/usercontroller.js'


const router = express.Router();


router.post('/searchUser',searchUser)

export default router
