import React, { useState, useEffect } from 'react';
import "./profile_update.css";
import assets from "../../assets/assets.js";
import axios from "axios";
import { AppContext } from '../../context/AppContext.jsx';
import {useNavigate} from "react-router-dom";
export const ProfileUpdate = ()=>{
    const [img, setImg] = useState(null);
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const navigate = useNavigate();
    const [preview, setPreview] = useState(null);
    const [prevImg, setPrevImg] = useState(null);
    

    let getData = async ()=>{
    const response = await axios.get("http://localhost:5000/dashboard", { withCredentials: true });
    setPrevImg(response.data.userProf[0].avatar_url||null);
    console.log(response.data.userProf[0].avatar_url||null);
    //prevImg = "http://localhost:5000/uploads/11-10-40-am-ChatGPT_Image_Apr_6,_2025,_08_01_05_AM.png";

    }
    useEffect(()=>{
      getData();
    },[]);
    const handleFileChange = async (e) => {
        
        if (e.target.files && e.target.files.length > 0) {
          setImg(e.target.files[0]);
          console.log("image link:"+URL.createObjectURL(e.target.files[0]));
          console.log(e.target.files[0]);
          setPreview(URL.createObjectURL(e.target.files[0]));
        }
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
    
        // Create a FormData object for multipart/form-data
        
        const formData = new FormData();
        if (img) {
          formData.append("avatar", (img));
        }
        formData.append("bio", bio);
        formData.append("name","King Star");
    
        try {
          // POST to the backend using the name as a URL parameter.
          const response = await axios.post(
            `http://localhost:5000/profileUpdate/${encodeURIComponent(name)}`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
              withCredentials: true,
            }
          );
          console.log("Profile updated:", response.data);
          // Optionally, you can display a success message or update UI.
          navigate("/chat");
        } catch (err) {
          console.error("Error updating profile:", err.response?.data?.msg || err.message);
        }
      };

    return(
        <div className="profile">
            <div className="profile-container">
                <form >
                    <h3>Profile Details</h3>
                    <label htmlFor="avatar">
                        <input onChange={(e)=>{return handleFileChange(e)}} type="file" id="avatar" accept=".png, .jpg,.jpeg" hidden/>
                        <img src={img?URL.createObjectURL(img):assets.avatar_icon} alt="" />
                        Upload Profile Image
                    </label>
                    <input type="text" placeholder="Your Name" onChange={(e)=>{return setName(e.target.value)}} required/>
                    <textarea placeholder="Write Profile Bio" onChange={(e)=>{return setBio(e.target.value)}} required></textarea>
                    <button type="submit" onClick={(e)=>{return handleSubmit(e)}}>Save</button>
                </form>
                <img src={img? preview:(prevImg ? prevImg : assets.logo_icon)} alt="" className="profile-pic"/>
                
            </div>
            
        </div>
    )
}