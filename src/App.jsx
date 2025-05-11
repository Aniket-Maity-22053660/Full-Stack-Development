import './App.css';
import { Login } from "./pages/Login/login.jsx";
import { Chat } from "./pages/Chat/chat.jsx";
import { ProfileUpdate } from "./pages/Profile_Update/profile_update.jsx";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useContext } from "react";
import {AppContext} from "./context/AppContext.jsx";
import axios from "axios";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const {loadUserData, userCred, userProf, setLastSeen} = useContext(AppContext);
  useEffect(() => { 
    const fetchUser = async () => {
      try {
        const response = await axios.get("http://localhost:5000/dashboard", { withCredentials: true });
        // Set the user state with the actual user ID from the response
        setUser(response.data.userId);
        await loadUserData();
        const intervalId = setInterval(()=>{setLastSeen(response.data.userId);console.log("executed inside interval");},10000);
      } catch (err) {
        console.log("User not logged in!");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) return (<div style={{"fontSize":"30px"}}>Loading...<br /><br /><b><i>Hang On....</i></b></div>)
    
  return (
    <>
     
      <Routes>
        <Route path="/" element={user ? <Navigate to="/chat" /> : <Login />} />
        <Route path="/chat" element={user ? <Chat /> : <Navigate to="/" />} />
        <Route path="/profile" element={user ? <ProfileUpdate /> : <Navigate to="/" />} />
      </Routes>
       
    </>
  );
}

export default App;

