import {createContext} from "react";
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";

export const AppContext = createContext();

const AppContextProvider = (props)=>{

    const [userProf, setUserProf] = useState(null);
    const [userCred, setUserCred] = useState(null);
    const [chatData, setChatData] = useState([]);
    const [allUsers, setAllUsers] = useState(null);
    const [othersProf, setOthersProf] = useState(null);
    const [userSelected, setUserSelected] = useState(false);
    const [lastMessage, setLastMessage] = useState({});
    const [seen, setSeen] = useState([]);
    const [unseenMessages, setUnseenMessages] = useState([]);

    const loadUserData = async()=>{
       const response = await axios.get("http://localhost:5000/dashboard", {withCredentials:true});
       setUserProf(response.data.userProf);
       setUserCred(response.data.userCred);
       setAllUsers(response.data.allUsers);
       console.log("inside Context!!");

       
    }

    const setLastSeen = async (uid)=>{
       const response = await axios.post("http://localhost:5000/update-last-seen", {user_id:uid}, {withCredentials:true});
       return response.data.last_seen;
    }
    const getLastSeen = async (uid)=>{
      const response = await axios.get(`http://localhost:5000/get-last-seen?user_id=${uid}`, {withCredentials:true});
      return response.data.last_seen;
    }

    const socket = useRef(null);

    useEffect(() => {
        socket.current = io("http://localhost:5000", { withCredentials: true });
      
        socket.current.on("connect", () => {
          if (userProf && Array.isArray(userProf) && userProf[0]) {
            socket.current.emit("register-user", userProf[0].user_id);
          }
        });
      
        return () => {
          socket.current.disconnect();
        };
      }, [userProf]); // Include userProf as dependency
      

    const value={
        userProf,setUserProf,
        userCred,setUserCred,
        chatData,setChatData,
        allUsers,loadUserData,
        othersProf,setOthersProf,
        userSelected,setUserSelected,
        lastMessage,setLastMessage,
        unseenMessages, setUnseenMessages,
        seen,setSeen, socket, setLastSeen,getLastSeen
    }

   
    return(
        <AppContext.Provider value={value}>
               {props.children}
        </AppContext.Provider>
    )
}

export default AppContextProvider;