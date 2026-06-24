// import { useEffect, useState } from "react";
// import { useSelector } from "react-redux";

// import axios from "axios";
// import { useNavigate, Outlet } from "react-router-dom";
// import api from "../config/ApiHandler";
// import Spinner from "../../pages/utlis/Spinner";


// const Privateroutes = () => {
//   const auth = useSelector((state) => state.auth);
//   const [ok, setOk] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const authcheck = async () => {
//       const accessToken = JSON.parse(localStorage.getItem("accessToken"))
//       const token =accessToken;
//       if (token) {
//         try {
//           const res = await api.get(
//             `${import.meta.env.VITE_BACKEND_URL}api/v1/auth/protected-routes`
//           );
//           console.log('private routes',res)

//           if (res?.data?.ok) {
//             setOk(true);
//           } else {
//             setOk(false);
//             navigate("/login");
//           }
//         } catch (error) {
//           setOk(false);
//           console.error("Authentication check failed:", error);
//           navigate("/login");
//         }
//         setLoading(false);
//       }
//     };
//     authcheck();
//   }, [auth?.token, navigate]);
//   // if (loading) {
//   //   return "Loading...";
//   // }
//   return ok ? <Outlet /> : <Spinner />;
// };

// export default Privateroutes;




import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { login,logout } from "../context/authSlice";
import axios from "axios";
import { useNavigate, Outlet } from "react-router-dom";
import api from "../config/ApiHandler";
import Spinner from "../../pages/utlis/Spinner";

const Privateroutes = () => {
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const authcheck = async () => {
      let token = localStorage.getItem("accessToken");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        // Try accessing a protected route
        const res = await api.get(
          `${import.meta.env.VITE_BACKEND_URL}api/v1/auth/protected-routes`
        );

        if (res?.data?.ok) {
          setOk(true);
        } else {
          throw new Error("Unauthorized");
        }
      } catch (error) {
        if (error.response?.status === 401) {
          console.log("Access token expired, trying to refresh...");

          try {
            const refreshRes = await api.post(
              `${import.meta.env.VITE_BACKEND_URL}api/v1/auth/refreshtoken`,
              {},
              { withCredentials: true }
            );

            if (refreshRes.data.accessToken) {
              localStorage.setItem("accessToken", refreshRes.data.accessToken);
              dispatch(login({ token: refreshRes.data.accessToken }));

              setOk(true);
              return;
            }
          } catch (refreshError) {
            console.error("Refresh token expired, logging out...");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("user");
            dispatch(logout());
            navigate("/login");
          }
        } else {
          console.error("Authentication check failed:", error);
          navigate("/login");
        }
      }
      setLoading(false);
    };

    authcheck();
  }, [auth?.token, navigate, dispatch]);

  return ok ? <Outlet /> : <Spinner />;
};

export default Privateroutes;
