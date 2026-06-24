import { useState } from 'react'
import { Routes, Route } from "react-router-dom";
import Privateroutes from './routes/PrivateRoutes';
import './App.css'
import Register from './Auth/Register'
import Login from './Auth/Login';
import Home from '../pages/Home';
import ChatBox from './components/Chatbox';

function App() {

  return (
    <>


    <Routes>
    <Route element={<Privateroutes />}>
          <Route path="/home" element={<Home />} />
          {/* <Route path="/chat/:userid" element={<ChatBox  />} /> */}

        </Route>


        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register /> } />

</Routes>
    </>
  )
}

export default App
