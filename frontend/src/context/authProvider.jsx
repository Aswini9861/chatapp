// AuthProvider.js
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from './authSlice'; // Import the login action
import axios from 'axios';

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  // Set axios authorization token
  axios.defaults.headers.common['Authorization'] = auth?.token? `Bearer ${auth.token}` : ""

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("accessToken");
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const parsedToken = storedToken;

        // Dispatch login only if both user and token exist
        if (parsedUser && parsedToken) {
          dispatch(login({ user: parsedUser, token: parsedToken }));
        }
      } catch (error) {
        console.error("Error parsing stored data:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
      }
    }
  }, [dispatch]);

  return children;
};

export default AuthProvider;
