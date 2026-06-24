import express from 'express'
import { loginController, refreshTokenController, registercontroller } from '../controller/authcontroller.js'
import { requireSignin } from '../middleware/authmiddleware.js'

const router = express.Router()

//register controller
router.post('/register',registercontroller)

//login controller
router.post('/login',loginController)

// protective routes
router.get('/protected-routes',requireSignin,(request,response)=>{
    response.status(200).send({ok:true})
  })


// refresh token
router.post('/refreshtoken',refreshTokenController)


export default router