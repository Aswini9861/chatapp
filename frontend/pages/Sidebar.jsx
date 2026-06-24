import {
  Card,
  Typography,
  List,
  ListItem,
  ListItemPrefix,
  Input,
  Avatar,
  Tooltip,
} from "@material-tailwind/react";
import { MagnifyingGlassIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import axios from "axios";
import ChatBox from "../src/components/Chatbox";
import { useDispatch,useSelector } from "react-redux";
import { logout } from "../src/context/authSlice";
import ProfileModal from "./profileModal";
import { useNavigate } from "react-router-dom";
import { useParams  } from "react-router-dom";
import useWebSocket from "../src/hooks/useWebSocket";
import { setSelectedUser } from "../src/context/chatSlice";
import { setUser } from "../src/context/authSlice";
const backendUrl = import.meta.env.VITE_BACKEND_URL;


const Sidebar = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const { user } = useSelector((state) => state.auth);

  const [isProfileOpen, setIsProfileOpen] = useState(false); // State for profile modal
  const auth = useSelector((state) => state.auth);
  const navigate = useNavigate()
  const { userid } = useParams();
  const { sendMessage, getUserStatuses } = useWebSocket(user?._id);
  const { userStatuses } = useSelector((state) => state.statuses);
  const { selectedUser } = useSelector((state) => state.chat);
const dispatch = useDispatch()


useEffect(() => {
  const userDataString = localStorage.getItem("user");
  if (userDataString && !user) {
    dispatch(setUser(JSON.parse(userDataString)));
  }
}, [dispatch, user]);


  useEffect(() => {
    const fetchRecentChats = async () => {
      if (!user || !user._id) return;

      try {
        const response = await axios.get(`${backendUrl}api/v1/chats/recent/${user._id}`);
        if (response?.data?.success) {
          setResults(response.data.chats); // Load chats into the UI
          const userIds = response.data.chats.map((chatUser) => chatUser._id);

          getUserStatuses(userIds);
        }
      } catch (error) {
        console.error("Failed to fetch recent chats", error);
      }
    };

    fetchRecentChats();
  }, [user]);



  useEffect(() => {
    const handleSearch = async () => {
      try {
        const response = await axios.post(`${backendUrl}api/v1/user/searchUser?query=${search}`);
        if (response?.data?.success) {
          setResults(response.data.users);
          const userIds = response.data.users.map((u) => u._id);

          getUserStatuses(userIds);
        }
      } catch (error) {
        setResults([]);
      }
    };

    handleSearch();
  }, [search]);




  const handleUserSelect = (selectedUser) => {
 
    dispatch(setSelectedUser(selectedUser));
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Card className="h-full w-72 p-4 shadow-xl shadow-blue-gray-900/5 bg-white border-r border-gray-300">
        <div className="mb-4 p-2 flex gap-4">
        <Tooltip content="Open Profile" placement="right">
        {user ? (
            <Avatar
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
              alt="User"
              size="sm"
              className="border-2 border-blue-500 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setIsProfileOpen(true)}
            />
          ) : (
            <p>Loading...</p>
          )}

        </Tooltip>
          <Typography className="font-semibold" variant="h5" color="blue-gray">
            Ak Chat
          </Typography>
        </div>
        <div className="p-1">
          <Input onChange={(e) => setSearch(e.target.value)} value={search} icon={<MagnifyingGlassIcon
          className="h-5 w-5 rounded-full" />} label="Search" />
        </div>
        <List className="mt-4 space-y-2">
          {results.map((user) => (
            <ListItem
              key={user._id}
              onClick={() => handleUserSelect(user)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-100 transition-all cursor-pointer"
            >
              <ListItemPrefix>
                <Avatar
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                  alt={user.username}
                  size="sm"
                  className="border-2 border-blue-500"
                />
              </ListItemPrefix>
              <div>
                <Typography variant="small" color="blue-gray">
                  {user.username}
                </Typography>
                <div className="flex items-center gap-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      userStatuses[user._id] === "online" ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  {userStatuses[user._id] === "online" && (
                    <span className="text-xs text-green-500">Online</span>
                  )}
                </div>
                {/* <Typography variant="paragraph" color="gray" className="text-xs">
                  {user.email}
                </Typography> */}
              </div>
            </ListItem>
          ))}
        </List>
      </Card>

      {/* ChatBox takes remaining space */}
      <div className="flex-grow flex items-center justify-center bg-gray-100">
        {selectedUser && selectedUser?._id ? (
          <ChatBox />
        ) : (
          <p className="text-gray-500">Select a user to start chatting</p>
        )}
      </div>
      <ProfileModal open={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
};

export default Sidebar;