import React from 'react';
import "./chat.css";
import { LeftSideBar } from '../../components/LeftSideBar/LeftSideBar';
import { ChatBox } from '../../components/ChatBox/ChatBox';
import { RightSideBar } from '../../components/RightSideBar/RightSideBar';
export const Chat = ()=>{
    return(
        <div className='chat'>
          <div className="chat-container">
            <LeftSideBar/>
           <ChatBox />
            <RightSideBar/>
          </div>
        </div>
    )
}
