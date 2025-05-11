import React, { useContext, useEffect, useState } from 'react';
import "./RightSideBar.css"
import assets from "../../assets/assets";
import axios from "axios";
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';

export const RightSideBar = ()=>{
    const {userProf, othersProf, getLastSeen} = useContext(AppContext);
    const [messages, setMessages] = useState([]);
    const [active, setActive] = useState(null);
    const { socket } = useContext(AppContext);
    const [isActive, setIsActive] = useState(false);
    const [presentLogged, setPresentLogged] = useState(false);
    const [lastSeen, setLastSeen] = useState(null);
    
    const navigate = useNavigate();
    
    function formatTime(ts1){
    const now = new Date();
    const givenDate = new Date(ts1);
    const isToday = now.toDateString() === givenDate.toDateString();
    const formatted = isToday
      ? givenDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) 
      : givenDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short' 
    }); 
    return formatted;
    }
    function compare(ts1) {
        const givenDate = new Date(ts1);
        const curr_time = Date.now();
        const given_time = givenDate.getTime();
        if((curr_time - given_time < 10000)){
            setIsActive(true);   
        }
        else{
            setIsActive(false);
            setLastSeen(formatTime(given_time));
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
        const fetchMessages = async () => {
            try {
                if (userProf.length > 0 && othersProf) {
                    const response = await axios.get(
                        `http://localhost:5000/get-messages?sender_id=${userProf[0].user_id}&receiver_id=${othersProf.user_id}`
                    );
                    setMessages(response.data.messages || []);
                }
            } catch (err) {
                console.error("Error fetching messages:", err.message);
            }
        };

        fetchMessages();
    },[userProf[0], othersProf]);
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
    
    return (
        <div className="rs">
           { othersProf ? (
        <div className="rs-profile" >
        <img src={othersProf.avatar_url} alt="avatar" />
        <h3 style={(isActive && presentLogged)?{"display":"flex","jusitfyContent":"center","gap":"5px","alignItems":"center", "flexDirection":"row"}:{"display":"flex", "justifyContent":"center", "flexDirection":"column", "alignItems":"center", "gap":"5px"}}>
        <div style={{"display":"flex", "justifyContent":"center", "alignItems":"center", "gap":"5px"}}><p>{othersProf.name}</p><p style={(isActive && presentLogged)?{"display":"none"}:null}><img src={assets.red_dot} className='dot' alt=''/></p></div>
        {(isActive && presentLogged)?<img src={assets.green_dot} className="dot" alt="" />:<span style={{ fontSize: "13px", color: "#999" }}>{lastSeen}</span>}       
        </h3>
        <p>{othersProf.bio}</p>
        </div>
        ):<div className="rs-profile" >
        <img src={userProf[0].avatar_url} alt="avatar" />
        <h3>
        {userProf[0].name}
        <img src={assets.green_dot} className="dot" alt="" />
        </h3>
        <p>{userProf[0].bio}</p>
        </div>}
            <hr/>
            
            <div className="rs-media">
                <p className="media" style={!othersProf?{"textAlign":"center", "fontWeight":"400", "fontSize":"large", "position":"absolute", "left":"95px", "bottom":"150px"}:{}}>{!othersProf?`Welcome ${userProf[0].name}`:"Media"}</p>
                <div>
                {
                    messages.map((item, index)=>(
                        item.sent_pic_url?<img key={index} src={item.sent_pic_url} alt="picture" onClick={()=>{window.open(item.sent_pic_url)}} style={{"cursor":"pointer"}}/>:null
                    ))
                }
                </div>
            <button onClick={(e)=>{return logOutHandler(e)}}>Logout</button>
            </div>
            
        </div>
    )
}