import React,{useState, useContext} from 'react'
import { useNavigate } from "react-router-dom";
import "./Login.css";
import assets from "../../assets/assets.js";
import axios from "axios";
import {AppContext} from "../../context/AppContext.jsx";
export const Login = ()=>{
    const [currState, setCurrState] = useState("Sign Up")
    const [userName, setUserName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const {loadUserData, userCred, userProf} = useContext(AppContext);
    const onSubmitHandler=async (e)=>{
        e.preventDefault();
        console.log("Indise handler");
        if(currState == "Sign Up"){
            try{
                setLoading(true);
                const response = await axios.post("http://localhost:5000/signup", {
                    name: userName,
                    email,
                    password
                },{ withCredentials: true });
                console.log("Signup Successful:", response.data);
                alert("Signup Successful! Please log in.");
                localStorage.setItem("authToken", response.data.token);
                navigate("/profile");
                window.location.reload();
                
            }catch(err){
                console.error("Signup Error:", err.response?.data?.msg || err.message);
            }
            finally {
                setLoading(false);
            }
        }
        else{
            try {
                setLoading(true);
                const response = await axios.post("http://localhost:5000/login", {
                    email,
                    password
                },{ withCredentials: true });
    
                console.log("Login Successful:", response.data);
                alert("Login Successful!");
               

                // ✅ Store token in localStorage
                localStorage.setItem("authToken", response.data.token);
                 // This reloads the page, triggering App.jsx useEffects
    
                // ✅ Redirect to dashboard
               
                
                navigate("/chat");
                
                window.location.reload();
               
                
            } catch (err) {
                console.error("Login Error:", err.response?.data?.msg || err.message);
                alert(err.response?.data?.msg || "Login failed");
            } finally {
                setLoading(false);
            }
        }
    }
    return (
        <div className='login'>
          <img src={assets.logo_big} alt="" className="logo" />
          <form action="" className="login-form" onSubmit={(e)=>{return onSubmitHandler(e);}}>
            <h2>{currState}</h2>
            {currState == "Sign Up" ?<input type="text" onChange={(e)=>{return setUserName(e.target.value)}} className="form-input" placeholder="username" required/>:null}<input type="email" onChange={(e)=>{return setEmail(e.target.value)}} className="form-input" placeholder="Email Address" required/><input type="password" onChange={(e)=>{return setPassword(e.target.value)}} placeholder="password" className="form-input" />
            <button type="submit">{currState == "Sign Up"?"Create Account":"Login Now"}</button>
            <div className="login-term">
                <input type="checkbox"/>
                <p>Agree to the terms of use & privacy policy.</p>
            </div>
            <div className="login-forgot">
                {
                    currState == "Sign Up"?<p className="login-toggle">Already have an account?<span onClick={()=>{setCurrState("Log In")}}>LogIn Here</span></p>:<p className="login-toggle">Create an account: <span onClick={()=>{setCurrState("Sign Up")}}>click here</span></p>
                }
            </div>
          </form>
        </div>
    )
}