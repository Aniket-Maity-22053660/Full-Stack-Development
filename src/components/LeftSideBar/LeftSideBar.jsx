import React, { useRef } from "react";
import './LeftSideBar.css';
import assets from "../../assets/assets";
import { useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { Socket } from "socket.io-client";
import { io } from "socket.io-client";



export const LeftSideBar = ()=>{
    const navigate = useNavigate();
    const {userProf, userCred, allUsers, othersProf, setOthersProf, chatData, setChatData, userSelected, setUserSelected, lastMessage, setLastMessage, unseenMessages, setUnseenMessages, setLastSeen} = useContext(AppContext);
    const [showSearch, setShowSearch] = useState(false); 
    const [user, setUser] = useState(null);
    const [otherUserId, setOtherUserId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [notify, setNotify] = useState(()=>new Map());
    const { socket } = useContext(AppContext);

    
    
    
    const modifyMap = (key, del = 0) => {
    setNotify(prevMap => {
    const newMap = new Map(prevMap);
    if (del !== 1) {
      newMap.set(key, true);
    } else {
      newMap.delete(key);
    }
    return newMap;
  });
};
    const inputHandler = async(e)=>{
        try{
            const input = e.target.value;
            const response = await axios.get(`http://localhost:5000/find/${encodeURIComponent(input)}?uid=${userProf[0].user_id}`, {withCredentials:true});
            if(response.data.stat == true){
                setUser(response.data.userInfo);
                setShowSearch(true);
            //console.log(response.data.msg);
            //console.log(userProf[0].avatar_url);
            //console.log(user);
            }else{
                setUser(null);
                setShowSearch(false);
            }
        }
        catch(err){
            console.log(err);
        }
    }
    
   
      
      
    useEffect(() => {
        console.log(user); // Log the user state whenever it changes
      }, [user]);
    
      useEffect(()=>{
        if(othersProf && socket.current){
          socket.current.emit("active-check", {sender_id:userProf[0].user_id, receiver_id:othersProf.user_id});
        }
      },[othersProf])
    
      useEffect(() => {
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          setLastMessage(prev => ({
            ...prev,
            [othersProf.user_id]: lastMsg.sent_pic_url ? "📷 Photo" : lastMsg.message,
            [userProf[0].user_id]: lastMsg.sent_pic_url ? "📷 Photo" : lastMsg.message,
          }));
        }
      }, [messages, othersProf]);
      
      useEffect(()=>{
        const handleReceiveLastMessage = (last)=>{
          setLastMessage((prev)=>({...prev, ...last}));
         }
        
        socket.current.on("receive-last-message",  handleReceiveLastMessage)
        
        const handleNotifyMe = (uid)=>{
          console.log("inside notify-me");
           
          modifyMap(uid);
          console.log("notification for user id= ", uid);
          if(uid == othersProf?.user_id){
            console.log("👁 Match with current chat user. Auto-hiding in 1 second.");

              setTimeout(()=>{modifyMap(uid, 1)}, 3000);
          }
        }
        socket.current.on("notify-me", handleNotifyMe)



        return () => {
          if(socket.current){
            socket.current.off("receive-last-message", handleReceiveLastMessage);
            socket.current.off("notify-me", handleNotifyMe);
          }
        };

      },[setLastMessage, setNotify, othersProf]);

    
      
    
      const fetchChatData = async (item) => {
        const uid = item.user_id;
        setOtherUserId(uid);  // Set other user ID correctly here
        setOthersProf(item);   // Set the selected user's profile
        setUserSelected(true); // Indicate that a user has been selected
      
        const response = await axios.get(
          `http://localhost:5000/get-messages?sender_id=${userProf[0].user_id}&receiver_id=${uid}`,
          { withCredentials: true }
        );
      
        if (uid === userProf[0].user_id) {
          setMessages([]);
        } else {
          const msgs = response.data.messages;
          setMessages(msgs);  // Update messages
          setChatData(msgs);  // Update chat data
      
          if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
           
      
            setLastMessage((prev) => ({
              ...prev,
              [item.user_id]: lastMsg.sent_pic_url ? "📷 Photo" : lastMsg.message,
            }));
          const reponse2 = await axios.post("http://localhost:5000/mark-seen/", {sender_id:uid, receiver_id:userProf[0].user_id}, {withCredentials:true});
            //setSeen((prev) => [...prev, item.user_id]);  // Update seen array in AppContext
          //socket.current.emit("send-message", reponse2.updated);
          socket.current.emit("mark-seen" , {uid});
          if(notify.has(uid))
          modifyMap(uid, 1);

          } else {
            setLastMessage((prev) => ({
              ...prev,
              [item.user_id]: "No messages yet",
            }));
          }
        }
      };
      
      
    
    
    
    const logOutHandler = async (e) => {
        try {
            const response = await axios.post("http://localhost:5000/logout", {}, { withCredentials: true });
            //console.log(response.data.msg);
            localStorage.clear();
            window.location.reload();
            // Optionally, perform any client-side cleanup or redirection here.
        } catch (err) {
            console.error("Logout error:", err.response?.data?.msg || err.message);
        }
    };


    return(
        <div className="ls">
            <div className="ls-top">
             <div className="ls-nav">
             <img src={assets.logo} alt="" className="logo"/>
                <div className="menu">
                <img src={assets.menu_icon}/>
                <div className="sub-menu">
                    <p onClick = {()=>{navigate("/profile")}}>Edit Profile</p>
                    <hr />
                    <p onClick = {(e)=>{logOutHandler(e)}}>LogOut</p>
                </div>
                </div>
             </div>
             <div className="ls-search">
                <img src={assets.search_icon} alt=""/>
                <input type="text" placeholder="Search here" onChange={(e)=>{inputHandler(e)}}/>
             </div>
            </div>
            <div className="ls-list">
                    {showSearch && user?
                    <div className="friends"  onClick={()=>{return fetchChatData(user)}}>

                        <img src={user.avatar_url} alt="picture" style={notify.has(user.user_id) ?{"border":"4px solid blue"}:{}}/>
                        <div>
                        <p>{user.name}</p>
                        <span>
                        {lastMessage[user.user_id]
                        ? lastMessage[user.user_id]
                        : user.bio || "Say hi!"}
                        
                        </span>
                        </div>
                    </div>:allUsers.map((item,index)=>{
                        return(
                    <div key={allUsers[index].user_id} className="friends" onClick={()=>{fetchChatData(item)}}>
                        <img src={allUsers[index].avatar_url} alt="" style={notify.has(item.user_id) ?{"border":"4px solid blue"}:{}}/>
                        <div>
                            <p>{allUsers[index].name}</p>
                            <span>
                        {lastMessage[item.user_id]
                        ? lastMessage[item.user_id]
                        : item.bio || "Say hi!"}
                       
                        </span>
                        </div>
                    </div>
                   )})}
                </div>
        </div>
    )
}
