// // refreshAccessToken.js
// import axios from 'axios';
// import api from './ApiHandler';
// import axiosPrivate from './ApiHandler';
// export const refreshAccessToken = async (navigate) => {
//   try {
//     const refreshToken = JSON.parse(localStorage.getItem("refreshToken"));
//     console.log('refreshToken',refreshToken)
//     const response = await axiosPrivate.post(`api/v1/auth/refreshtoken`, {refreshToken:refreshToken});
//     console.log('refresh token:',response)

//     const newAccessToken = response?.data?.accessToken;
//     const newRefreshToken = response?.data?.refreshToken;
//     if (newAccessToken && newRefreshToken) {
//       localStorage.setItem("accessToken", JSON.stringify(newAccessToken));
//       localStorage.setItem("refreshToken", JSON.stringify(newRefreshToken));

//     api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
//     axiosPrivate.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

//     return newAccessToken;
//     }
//   } catch (error) {
//     console.error("Failed to refresh token:", error);
//     if (navigate) navigate("/login");
//     return null;
//   }
// };




// refreshAccessToken.js
import axiosPrivate from "./ApiHandler";

export const refreshAccessToken = async (navigate) => {
  try {
    const response = await axiosPrivate.post(
      `api/v1/auth/refreshtoken`,
      {},  // No need to send refresh token manually
      { withCredentials: true } // Ensure cookies are sent
    );

    console.log("Refresh Token Response:", response);

    const newAccessToken = response?.data?.accessToken;
    if (newAccessToken) {
      localStorage.setItem("accessToken",newAccessToken);
      // Store only access token in memory or React state (not localStorage)
      axiosPrivate.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

      return newAccessToken;
    }
  } catch (error) {
    console.error("Failed to refresh token:", error);
    if (navigate) navigate("/login");
    return null;
  }
};
