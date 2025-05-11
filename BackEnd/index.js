import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import cookieParser from "cookie-parser";
import multer from "multer";
import http from 'http';
import { Server } from 'socket.io';


dotenv.config();
const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);


// Middleware
app.use(cookieParser());

app.use(cors(
    {
        origin:"http://localhost:5173",
        credentials:true
    }
));
app.use(express.json());
app.use(express.urlencoded({extended:true})); // Parses incoming JSON requests
app.use(express.static("public"));


// Test Route
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const io = new Server(server,{
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

const userSocketMap = new Map();
io.on("connect", (socket)=>{
    //console.log(`${socket.id} has joined our server!`);

    socket.on("register-user", (uid) => {
        if (!uid) {
            console.log("Received invalid uid");
            return;
        }
        userSocketMap.set(uid, socket.id);
        console.log(`User ${uid} registered with socket ID ${socket.id}`);
    });
    
    socket.on("active-check", (obj)=>{
        const r_id = userSocketMap.get(obj.sender_id);
        //console.log("niside active check :", obj);
        if(userSocketMap.has(obj.receiver_id)){
            //console.log("yes it does!");
            socket.emit("check-active", true);
        }
        else{
            socket.emit("check-active", false);
           // console.log("No does not!");
        }
    })
   

    socket.on("send-message", (chatData, obj)=>{
        const r_id = userSocketMap.get(obj?.uid);
      socket.to(r_id).emit("receive-message", chatData);
    })
    socket.on("send-last-message", (last, obj)=>{
        const r_id = userSocketMap.get(obj?.uid);
        socket.to(r_id).emit("receive-last-message", last);
    })
    socket.on("mark-seen", (obj)=>{
        if(obj){
            const r_id = userSocketMap.get(obj?.uid);
            socket.to(r_id).emit("msgs-seen");
        }else{
        socket.emit("msgs-seen");
        }
    })
    socket.on("updated-mark-seen", (newChatData, obj)=>{
        const r_id = userSocketMap.get(obj?.uid);
       socket.to(r_id).emit("mark-seen-updated", newChatData);
    })
    socket.on("set-notify-me", (notify_obj)=>{
        console.log("Inside set notify me = ", notify_obj);
        const r_id = userSocketMap.get(notify_obj.receive_uid);
        console.log("r-id = ", r_id);
        socket.to(r_id).emit("notify-me", notify_obj.send_uid);

    })
    socket.on("get_last_seen", (obj)=>{
        console.log("inside get lst seen");
        const r_id = userSocketMap.get(obj.user_id);
        socket.to(r_id).emit("last-seen-got",obj.user_id);
    })
    socket.on("disconnect", () => {
        // Remove the disconnected user from the map
        for (const [userId, sockId] of userSocketMap.entries()) {
          if (sockId === socket.id) {
            userSocketMap.delete(userId);
            break;
          }
        }
        })
   
})




pool.connect()
    .then(() => console.log("✅ Connected to PostgreSQL via pgAdmin!"))
    .catch((err) => console.error("❌ Database connection failed", err));


    const authMiddleware = (req, res, next) => {
        //console.log("Cookie received: ",req.cookies);
        const token = req.cookies.authToken; // Extract token
        if (!token) return res.status(401).json({ msg: "No token, authorization denied" });
         
        try {
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            //console.log(decoded);
            req.user = decoded;
            next();

        } catch (err) {
            res.status(401).json({ msg: "Invalid token" });
        }
    };

    const users = {}; // userId => socketId




    app.post("/signup", [
        body("name").notEmpty(),
        body("email").isEmail(),
        body("password").isLength({ min: 6 })
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
        const { name, email, password } = req.body;
    
        try {
            // Check if user already exists
            const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
            if (existingUser.rows.length > 0) return res.status(400).json({ msg: "Email already registered" });
    
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
    
            // Insert user into DB
            const newUser = await pool.query(
                "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
                [name, email, hashedPassword]
            );
    
            // Generate JWT Token
            const token = jwt.sign({ id: newUser.rows[0].id }, process.env.SECRET_KEY, { expiresIn: "1h" });
            
            res.cookie("authToken", token, {
                httpOnly: true,
                secure: false, // false in development
                sameSite: "lax",  // Change to lax for development
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            
            return res.json({ token });
        } catch (err) {
            console.error(err);
            res.status(500).send("Server error");
        }
    });

    // 🔓 Login Route
app.post("/login", [
    body("email").isEmail(),
    body("password").notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
        // Check if user exists
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.status(400).json({ msg: "Invalid email or password" });

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.rows[0].password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid email or password" });

        // Generate JWT Token
        const token = jwt.sign({ id: user.rows[0].id }, process.env.SECRET_KEY, { expiresIn: "1h" });
        res.cookie("authToken", token, {
            httpOnly: true,
            secure: false, // false in development
            sameSite: "lax",  // Change to lax for development
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        

        return res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.get("/dashboard", authMiddleware,  async(req, res) => {
    //console.log("Inside dashboard controller: User ID =", req.user.id);
    const userCred = await pool.query("SELECT * FROM users WHERE id = $1",[req.user.id]);
    //console.log(userCred.rows);
    const userProf = await pool.query("SELECT * FROM user_data WHERE user_id = $1", [req.user.id]);
    //console.log(userProf.rows);
    const allUsers = await pool.query("SELECT * FROM user_data WHERE user_id != $1",[req.user.id]);
    return res.json({ msg: "Welcome to your dashboard!", userId: req.user.id, userCred:userCred.rows, userProf:userProf.rows, allUsers:allUsers.rows});
});
app.post("/logout", (req, res) => {
    res.clearCookie("authToken", {
        httpOnly: true,
        secure: false, // false in development
        sameSite: "lax", // Use the same sameSite value as when the cookie was set
    });
    return res.json({ "msg": "Logged out successfully" });
});
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "public/uploads/"); // Files will be saved in the public/uploads folder
    },
    filename: (req, file, cb) => {
        const sanitizedFilename = file.originalname.replace(/\s/g, "_");
        cb(null, new Date().toLocaleTimeString().replace(/[:\s,]/g, "-") + "-" + sanitizedFilename);
    }
  });
  const upload = multer({ storage: storage });


// Profile Update Route (Parameterized)
// This route now uses multer's upload.single("avatar") to handle the file upload.
app.post("/profileUpdate/:name", authMiddleware, upload.single("avatar"), async (req, res) => {
    // Get new name from the URL parameter
    const newName = req.params.name;
    // Get the authenticated user's ID from the auth middleware (decoded token)
    const userId = req.user.id;
    
    // Get additional profile fields from the request body
    // Here, we expect "bio" in the body.
    const { bio } = req.body;
    //console.log(req.body);
    // If a file was uploaded, build the URL to access the file.
    // For development, this might be: http://localhost:PORT/uploads/<filename>
    let avatar_url = null;
    if (req.file) {
      avatar_url = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    }
    console.log(req.file.filename);
    try {
      // Upsert into user_data table.
      // Ensure that the user_data table has a UNIQUE constraint on user_id.
      const result = await pool.query(
        `INSERT INTO user_data (user_id, avatar_url, bio, name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id)
         DO UPDATE SET avatar_url = EXCLUDED.avatar_url,
                       bio = EXCLUDED.bio,
                       name = EXCLUDED.name,
                       uploaded_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, avatar_url, bio, newName]
      );
  
      res.json({ msg: "Profile updated successfully", profile: result.rows[0] });
    } catch (err) {
      console.error("Error updating profile:", err);
      res.status(500).json({ msg: "Server error" });
    }
});
app.get("/find/:input", async(req,res)=>{
    const userName = req.params.input;
    const {uid} = req.query;
    const response = await pool.query("SELECT * FROM user_data WHERE name = $1",[userName]);
    //console.log(response.rows);
    if(response.rows.length == 0 || (response.rows[0].user_id == uid)){
        res.json({msg:"user not found!",stat:false});
    }
    else{
        res.json({msg: "user found successfully!", userInfo:response.rows[0], stat:true});
    }
})
app.post("/send-message", upload.single("image"),async (req, res) => {
    const { sender_id, receiver_id, message } = req.body;
    let file_name = null;
    if(req.file){
     file_name = req.file.filename;
    }
    let pic_url = null;
    if(file_name){
        pic_url = `http://localhost:${PORT}/uploads/${file_name}`;
    }
    
    try {
        const response = await pool.query(
            "INSERT INTO messages (sender_id, receiver_id, message, sent_pic_url) VALUES ($1, $2, $3, $4) RETURNING *",
            [sender_id, receiver_id, message, pic_url]
        );
        res.json({ msg: "Message sent successfully!", data: response.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Error sending message" });
    }
});
app.get("/get-messages", async (req, res) => {
    const { sender_id, receiver_id } = req.query;

    try {
        const response = await pool.query(
            `SELECT * FROM messages 
             WHERE (sender_id = $1 AND receiver_id = $2) 
                OR (sender_id = $2 AND receiver_id = $1)
             ORDER BY timestamp ASC`,
            [sender_id, receiver_id]
        );
       // console.log(response.rows);
        res.json({ messages: response.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Error fetching messages" });
    }
});
app.post("/mark-seen", async (req, res) => {
    const { sender_id, receiver_id } = req.body;
    try {
        const result = await pool.query(
            `UPDATE messages 
             SET seen = TRUE 
             WHERE sender_id = $1 AND receiver_id = $2 AND seen = FALSE RETURNING *`,
            [sender_id, receiver_id]
        );
        res.json({ msg: "Messages marked as seen", updated: result.rows});
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Error updating seen status" });
    }
});

// Update last_seen
app.post('/update-last-seen', async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ msg: 'Missing user_id' });
    }

    try {
        const result = await pool.query(
            'UPDATE user_data SET last_seen = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING last_seen',
            [user_id]
        );

        res.status(200).json({ msg: 'Last seen updated', last_seen: result.rows[0].last_seen });
    } catch (err) {
        console.error('Error updating last_seen:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});
app.get("/get-last-seen", async(req,res)=>{
    const { user_id } = req.query;
    if(!user_id){
        return res.status(400).json({msg: 'Missing user id'});
    }
    try{
        const result = await pool.query("SELECT last_seen from user_data WHERE user_id = $1",[user_id]);
        res.status(200).json({last_seen: result.rows[0].last_seen});
    }catch(err){
        console.log("Error getting last_seen", err.message);
        res.status(500).json({ msg: 'Server error' });

    }
});




  
  














app.get("/", (req, res) => {
    res.send("Backend is running!");
});

// Start Server
server.listen(PORT, () => {
    console.log(`Server (with Socket.IO) is running on port ${PORT}`);
});

