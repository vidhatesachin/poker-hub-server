import  express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
 
const roomSocketsMap = new Map();

const app = express();

const server = createServer(app);

const io = new Server(server,{
    cors:{
        origin: "*",
        methods: ["GET","POST","PUT"],
        credentials: true
    }
});

io.on("connection", (socket)=>{

   
    console.log("User is connected : ", socket.id);
    socket.on("disconnect",()=>{
        console.log("User is disconnected : ", socket.id);
        roomSocketsMap.forEach((sockets, roomId) => {
            if (sockets.has(socket)) {
              sockets.delete(socket);
              console.log(`Socket ${socket.id} removed from room ${roomId}`);
              // Broadcast updated user list to all clients in the room
              broadcastUserList(roomId);
            }
          });
    })

    socket.emit("welcome","Welcome to the server "+socket.id );

    socket.broadcast.emit("welcome",socket.id+" joined the server "); //event data will be broadcast to every sockets except the sender
    
     // Event handler for creating a new room
    socket.on("createRoom", (callback) => {
        const roomId = generateRoomId(32);
        roomSocketsMap.set(roomId, new Set()); 
        console.log("Creating a room id : ", roomId);
        callback(roomId);
    });

    // Event handler for joining a room
    socket.on("joinRoom", (roomId, displayName, callback) => {
        // Check if the room exists
        if (roomSocketsMap.has(roomId)) {
            // Add the socket to the room
            const room = roomSocketsMap.get(roomId);
            let replacedSocket = false;
            room.forEach((entry) => {
                if (entry.displayName === displayName) {
                    // Replace the socket for the entry if displayName matches
                    entry.socket = socket;
                        replacedSocket = true;
                }
            });

            // If socket was not replaced, add a new entry
            if (!replacedSocket) {
                room.add({ socket, displayName });
            }
            console.log(`Socket ${socket.id} , ${displayName} joined room ${roomId}`);
    
            broadcastUserList(roomId);
    
            // Callback with success message
            callback({ success: true, message: "Joined room successfully" });
            
            
        } else {
            console.log(`Room ${roomId} does not exist`);
            // Callback with error message
            callback({ success: false, message: "Room does not exist" });
        }
    });

    // Function to broadcast updated user list to all clients in the room
    function broadcastUserList(roomId) {
        const users = Array.from(roomSocketsMap.get(roomId)).map((entry) => entry.displayName);
        roomSocketsMap.get(roomId).forEach((entry) => {
            console.log(entry.socket.id + "users ", users);
            entry.socket.emit("userListUpdate", users);
        });
    }
}) 
app.get("/",(req, res)=>{
    res.send("I am up and running!");
}) 

server.listen(3000,()=>{
    console.log("Server is running at port 3000");
})

function generateRoomId(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
  