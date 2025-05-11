import React from 'react';
import './ChatBox.css';
import assets from '../../assets/assets';
import {useContext, useState, useEffect, useRef} from "react";
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';







export const ChatBox = ()=>{
     
    const {userProf, othersProf, chatData, setChatData, userSelected, setUserSelected, lastMessage, setLastMessage, seen, setSeen, getLastSeen} = useContext(AppContext);
    const navigate = useNavigate();
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [image, setImage] = useState({picture:"",user:""});
    const [messages, setMessages] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const [presentLogged, setPresentLogged] = useState(false);
    //const [seen, setSeen] = useState([]);

    const fileInputRef = useRef(null);
    const chatEndRef = useRef();
    
    const { socket } = useContext(AppContext);


    const myId = userProf[0]?.user_id;
    const otherId = othersProf?.user_id;
    
    const filteredChat1 = Array.isArray(chatData)
    ? chatData.filter(item =>
        
        (item.sender_id === myId && item.receiver_id === otherId) ||
        (item.sender_id === otherId && item.receiver_id === myId)
      )
    : [];
    const filteredChat = [...filteredChat1].reverse();

    
     function compare(ts1) {
            const givenDate = new Date(ts1);
            const curr_time = Date.now();
            const given_time = givenDate.getTime();
            if((curr_time - given_time < 10000)){
                setIsActive(true);   
            }
            else{
                setIsActive(false);
            }
        }
    
        useEffect(() => {
        if (othersProf && socket.current) {
            console.log("just came inside!");
    
            const handleCheckActive = (flag) => {
                console.log("hey there");
                console.log("flag:", flag);
                setPresentLogged(flag);
            };
    
            socket.current.on("check-active", handleCheckActive);
    
            return () => {
                socket.current.off("check-active", handleCheckActive);
            };
        }
    }, [othersProf]);

   useEffect(() => {
       const fetchLastSeenData = async ()=>{
       if (othersProf && othersProf.user_id) {
           const latest_timestamp = await getLastSeen(othersProf.user_id);
           compare(latest_timestamp);
           socket.current.emit("active-check", {
           sender_id: userProf[0].user_id,
           receiver_id: othersProf.user_id
         });
       }
       }
       const intervalId= setInterval(fetchLastSeenData, 3000);
   
       return () => clearInterval(intervalId);
       }, [othersProf]);
    
    useEffect(()=>{
    
      const handleReceiveMessage = (newChatData)=>{
        setChatData((prev) => (Array.isArray(prev) ? [...prev, newChatData] : [newChatData]));
        console.log("receiver_id:", newChatData.receiver_id, "othersProf.user_id:", othersProf?.user_id);
        if(newChatData.sender_id == othersProf?.user_id){
            socket.current.emit("updated-mark-seen", newChatData, {uid:othersProf?.user_id});
        }
        else{
        }
       }
       socket.current.on("receive-message", handleReceiveMessage);
        
      const handleReceiveLastMessage = (last)=>{
        setLastMessage((prev)=>({...prev, ...last}));
       }
       socket.current.on("receive-last-message", handleReceiveLastMessage );
       
       const handleSeen = async ()=>{ 
        const uid = othersProf?.user_id;
        const response = await axios.get(
            `http://localhost:5000/get-messages?sender_id=${userProf[0].user_id}&receiver_id=${uid}`,
            { withCredentials: true }
          );
          if(uid != userProf[0].user_id){
            const msgs = response.data.messages;
            setChatData(msgs);
          }

       }
       socket.current.on("msgs-seen",handleSeen)

       const handle_updated = async (updated)=>{
        const receiver_id = updated.receiver_id;
        const sender_id = updated.sender_id;
        const reponse2 = await axios.post("http://localhost:5000/mark-seen/", {sender_id, receiver_id}, {withCredentials:true});
        socket.current.emit("mark-seen");


       }

       socket.current.on("mark-seen-updated", handle_updated);
       
       return () => {
        if (socket.current) {
          socket.current.off("receive-message", handleReceiveMessage);
          socket.current.off("receive-last-message", handleReceiveLastMessage);
          socket.current.off("msgs-seen", handleSeen);
          socket.current.off("mark-seen-updated", handle_updated);
        }
      };

    }, [setLastMessage, setChatData, userProf[0], othersProf]);

  
  
    
    
   

    useEffect(() => {
        if (!userSelected || !fileInputRef.current) return;
      
        // Scroll to top instead of bottom
        fileInputRef.current.scrollTop = 0;
      
      }, [filteredChat.length, userSelected, loading, othersProf?.user_id]);
    

    useEffect(()=>{
        if(chatData.length>0 || userSelected){
            setLoading(true);
            setTimeout(()=>{
                {
                    setLoading(false);
                }
            },300);
        }
        else if(chatData.length == 0){
            setUserSelected(false);
        }
        
        //console.log(chatData);
}, [userSelected, chatData])

  
    // Handle new messages
    
        // Empty dependency array to ensure this effect runs only once
  

       
        
  
  
  
  const sendImageMessage = async(file)=>{
    const formData = new FormData();
    formData.append('image', file);
    formData.append('sender_id', userProf[0].user_id);
    formData.append('receiver_id', othersProf.user_id);
    formData.append('message', input);
    const res = await axios.post("http://localhost:5000/send-message", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });
    return res.data.data.sent_pic_url;
  }

const sendMessage = async ()=>{
    if(!image.picture){
    const response = await axios.post("http://localhost:5000/send-message",{"sender_id":userProf[0].user_id,"receiver_id":othersProf.user_id,"message":input});
    setLastMessage((prev)=>({
        ...prev,
        [othersProf.user_id]: input
    }))//otherwise it will not re-render to produce our expected result! 

    const message = {
        sender_id: userProf[0].user_id,
        receiver_id: othersProf.user_id,
        message: input,
        
      };
  
      // Emit the message to the server via WebSocket
      

    setChatData(
        (prevUsers)=>Array.isArray(prevUsers)?[
            ...prevUsers,
            {...message, "timestamp": new Date().toISOString()}
        ]:[{ ...message, timestamp: new Date().toISOString() }]
    )//otherwise it will not re-render to produce our expected result!
    //console.log(response.msg);
    //console.log(response.data);
    setInput("");
    socket.current.emit("send-message", {...message,"timestamp":new Date().toISOString()}, {uid:message.receiver_id});
    socket.current.emit("send-last-message", {[userProf[0].user_id]:input?input:"image", [othersProf]:input?input:"image"}, {uid:message.receiver_id});
    socket.current.emit("set-notify-me", {send_uid:message.sender_id, receive_uid:message.receiver_id});
}
else{
    const sent_pic_url = await sendImageMessage(image.picture);
    if(!input){
        setLastMessage((prev)=>({
            ...prev,
            [othersProf.user_id]: "image"
        }))
    }else{
        setLastMessage((prev)=>({
            ...prev,
            [othersProf.user_id]: input
        }))
    }
    const message = {
        sender_id: userProf[0].user_id,
        receiver_id: othersProf.user_id,
        message: input,
        sent_pic_url:sent_pic_url
      };
      setChatData(
        (prevUsers)=>Array.isArray(prevUsers)?[
            ...prevUsers,
            {...message,  "timestamp": new Date().toISOString()}
        ]:[{ ...message,   timestamp: new Date().toISOString() }]
    )//otherwise it will not re-render to produce our expected result!
    //console.log(response.msg);
    //console.log(response.data);
    setInput("");
    setImage({picture:"", user:""});
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    socket.current.emit("send-message", {...message, "timestamp": new Date().toISOString()}, {uid:message.receiver_id});
    socket.current.emit("send-last-message", {[userProf[0].user_id]:input?input:"image", [othersProf]:input?input:"image"}, {uid:message.receiver_id});
    socket.current.emit("set-notify-me", {send_uid:message.sender_id, receive_uid:message.receiver_id});

}
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
  
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
  
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const today = new Date();
    
    // Check if message is from today
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
    
    if (isToday) {
      return `${hours}:${minutes}`;
    } else {
      return `${hours}:${minutes} | ${day}/${month}`;
    }
  }
  
  if (
    !userSelected ||
    !Array.isArray(userProf) || userProf.length === 0 ||
    !othersProf
  ) {
    return (
      <div className="chat-welcome">
        <img src={assets.logo_big} alt="big_pic" />
        <p style={{ fontSize: "30px" }}>Chat anytime, from anywhere</p>
        <br /><b><i>Made with 🫶 from Contai.</i></b>
      </div>
    );
  }





  


    return !userSelected?(<div className="chat-welcome">
        <img src={assets.logo_big} alt="big_pic"/>
        <p style={{"fontSize":"30px"}}>Chat anytime, from anywhere</p>
        <br/><b><i>Made with 🫶 from Contai.</i></b>
        </div>):loading?(<div className="set-loading">
            LOADING....</div>):((chatData.length > 0)?(
        <div className="chat-box">
        <div className="chat-user">
          <div>
          <img src={othersProf.avatar_url} alt=""/>
          <p>
            {othersProf.name}
           {isActive && presentLogged && <img src={assets.green_dot} className="dot" alt="" />}
           </p>
           </div>
           <img src={assets.help_icon} className='help' alt=''/>
        </div>
        <div className="chat-msg">
        {filteredChat.map((item, index)=>(
                 <div key={index} className={item.sender_id === userProf[0].user_id?"s-msg":"r-msg"}>
                    {item.sent_pic_url?(
                        <div>
                 <img src={item.sent_pic_url} alt="" className='msg-img' style={item.sent_pic_url && item.message?{"marginBottom":"0"}:{"marginBottom":"30px"}}/>
                 <p>
                 {formatTimestamp(item.timestamp)}
                 {item.sender_id === myId && item.seen && !item.message &&(
                        <span style={{ marginLeft: "5px", color: "green", fontSize:"14px", fontWeight:"400" }}>✔✔</span>
                        )}
                </p>
                 {item.message?
                    <p className="msg">{item.message}{item.sender_id === myId && item.seen && (
                        <span style={{ marginLeft: "5px", color: "white" }}>✔✔</span>
                        )}</p> : <></>
                 }
                
                 </div>
                 ):(
                    <p className="msg">{item.message}{item.sender_id === myId && item.seen && (
                        <span style={{ marginLeft: "5px", color: "white" }}>✔✔</span>
                        )}</p>
                    )}
                 <div>
                    <img src={item.sender_id === userProf[0].user_id?userProf[0].avatar_url:othersProf.avatar_url} alt=""/>
                    <p>
                 {formatTimestamp(item.timestamp)}
                </p>
                 </div>
                </div>
            ))}
              <div ref={chatEndRef}></div>

        </div>
        <div className="chat-input">
    {image && image.picture && image.user == othersProf.user_id &&(
        <div className="image-preview">
            <img src={URL.createObjectURL(image.picture)} alt="preview" className="preview-thumbnail" />
            <button className="remove-img" onClick={() => {
                setImage({picture:"", user:""});
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }}>×</button>
        </div>
    )}
    <input
        type="text"
        placeholder="Send a message"
        onChange={(e) => setInput(e.target.value)}
        value={input}
    />
    <input
        type="file"
        ref={fileInputRef}
        id="image"
        accept="image/png, image/jpeg"
        onChange={(e) => {
            const file = e.target.files[0];
            setImage({picture:file, user:othersProf.user_id});
        }}
        hidden
    />
    <label htmlFor="image">
        <img src={assets.gallery_icon} alt="Upload" />
    </label>
    <img src={assets.send_button} alt="Send" onClick={sendMessage} />
</div>

        </div>
    ):(<div className="chat-box">
        <div className="chat-user">
          <div>
          <img src={othersProf.avatar_url} alt=""/>
          <p>
            {othersProf.name}
           {isActive && presentLogged && <img src={assets.green_dot} className="dot" alt="" />}
           </p>
           </div>
           <img src={assets.help_icon} className='help' alt=''/>
        </div>
        <div className="chat-msg">
        {filteredChat.map((item, index)=>(
                 <div key={index} className={item.sender_id === userProf[0].user_id?"s-msg":"r-msg"}>
                    {item.sent_pic_url?(
                        <div>
                 <img src={item.sent_pic_url} alt="" className='msg-img' style={item.sent_pic_url && item.message?{"marginBottom":"0"}:{"marginBottom":"30px"}}/>
                <p>
                 {formatTimestamp(item.timestamp)}
                 {item.sender_id === myId && item.seen && !item.message(
                        <span style={{ marginLeft: "5px", color: "green" }}>✔✔</span>
                        )}
                </p>
                 {item.message?
                    <p className="msg">{item.message}{item.sender_id === myId && item.seen && (
                        <span style={{ marginLeft: "5px", color: "white" }}>✔✔</span>
                        )}</p>:
                    <></>
                 }
                 </div>
                 ):(
                    <p className="msg">{item.message}{item.sender_id === myId && item.seen && (
                        <span style={{ marginLeft: "5px", color: "white" }}>✔✔</span>
                        )}</p>
                    )}
                 <div>
                    <img src={item.sender_id === userProf[0].user_id?userProf[0].avatar_url:othersProf.avatar_url} alt=""/>
                    <p>
                 {formatTimestamp(item.timestamp)}
                </p>
                 </div>
                </div>
            ))}
            <div ref={chatEndRef}></div>
        </div>
        
        <div className="chat-input">
        {image && image.picture && image.user == othersProf.user_id &&(
        <div className="image-preview">
            <img src={URL.createObjectURL(image.picture)} alt="preview" className="preview-thumbnail" />
            <button className="remove-img" onClick={() => {
                setImage({picture:"", user:""});
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }}>×</button>
        </div>
    )}
            <input type="text" placeholder="Send a message" onChange={(e)=>{setInput(e.target.value)}} value={input}/>
            <input type="file" id="image" ref={fileInputRef} accept='image/png, image/jpeg' onChange = {(e)=>{
                const file = e.target.files[0];
                setImage({picture:file, user:othersProf.user_id})
            }}hidden/>
            <label htmlFor="image">
                <img src={assets.gallery_icon} alt=""/>
            </label>
            <img src={assets.send_button} alt="" onClick={sendMessage}/>
        </div>
    </div>
    )
)
}







