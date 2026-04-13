// // // // // import { app } from "./app.js";
// // // // // import { connectDB } from "./config/db.js";
// // // // // import { env } from "./config/env.js";
// // // // // import 'dotenv/config';
// // // // // connectDB()
// // // // //   .then(() => {
// // // // //     app.listen(env.port, () => {
// // // // //       // eslint-disable-next-line no-console
// // // // //       console.log(`Backend running on port ${env.port}`);
// // // // //     });
// // // // //   })
// // // // //   .catch((error) => {
// // // // //     // eslint-disable-next-line no-console
// // // // //     console.error("DB connection failed", error);
// // // // //     process.exit(1);
// // // // //   });




// // // // // 1. Load environment variables FIRST
// // // // import 'dotenv/config'; 

// // // // // 2. Now import files that rely on those variables
// // // // import { app } from "./app.js";
// // // // import { connectDB } from "./config/db.js";
// // // // import { env } from "./config/env.js";

// // // // connectDB()
// // // //   .then(() => {
// // // //     // Use the port from your env config
// // // //     const PORT = env.port || 5000;
// // // //     app.listen(PORT, () => {
// // // //       console.log(`Backend running on port ${PORT}`);
// // // //     });
// // // //   })
// // // //   .catch((error) => {
// // // //     console.error("DB connection failed", error);
// // // //     process.exit(1);
// // // //   });





// // // // 1. Load environment variables FIRST
// // // import 'dotenv/config'; 

// // // // 2. Import dependencies
// // // import http from "http";
// // // import { Server } from "socket.io";
// // // import { app } from "./app.js";
// // // import { connectDB } from "./config/db.js";
// // // import { env } from "./config/env.js";

// // // // 3. Create HTTP Server & Initialize Socket.io
// // // const server = http.createServer(app);
// // // const io = new Server(server, { 
// // //   cors: { 
// // //     origin: env.corsOrigins.length > 0 ? env.corsOrigins : "*" 
// // //   } 
// // // });

// // // // 4. Socket Connection Logic
// // // io.on("connection", (socket) => {
// // //   // Users join a room specific to their godown for targeted alerts
// // //   socket.on("join-godown", (godownId) => {
// // //     socket.join(godownId);
// // //     console.log(`User joined godown room: ${godownId}`);
// // //   });

// // //   // Admins join a global admin room for all alerts
// // //   socket.on("join-admin", () => {
// // //     socket.join("admins");
// // //     console.log("Admin joined admins room");
// // //   });
// // // });

// // // // 5. Connect DB and Listen
// // // connectDB()
// // //   .then(() => {
// // //     const PORT = env.port || 5000;
// // //     server.listen(PORT, () => {
// // //       console.log(`Backend running with Socket.io on port ${PORT}`);
// // //     });
// // //   })
// // //   .catch((error) => {
// // //     console.error("DB connection failed", error);
// // //     process.exit(1);
// // //   });

// // // // Export 'io' to use it inside your routes to emit events
// // // export { io };





// // // 1. Load environment variables FIRST
// // import 'dotenv/config'; 

// // // 2. Import dependencies
// // import http from "http";
// // import express from 'express';
// // import cors from 'cors';
// // import { Server } from "socket.io";
// // import { app } from "./app.js"; // This is your express app instance
// // import { connectDB } from "./config/db.js";
// // import { env } from "./config/env.js";

// // // --- INTEGRATION: CORS & MIDDLEWARE ---
// // // We apply these to the 'app' instance imported from ./app.js
// // app.use(cors({
// //   origin: ['http://localhost:5174', 'http://localhost:5173'], // Allow both Client and Admin
// //   credentials: true
// // }));

// // app.use(express.json());
// // // --------------------------------------

// // // 3. Create HTTP Server & Initialize Socket.io
// // const server = http.createServer(app);
// // const io = new Server(server, { 
// //   cors: { 
// //     // Ensuring Socket.io also respects your frontend origins
// //     origin: ["http://localhost:5174", "http://localhost:5173"],
// //     methods: ["GET", "POST"]
// //   } 
// // });

// // // 4. Socket Connection Logic
// // io.on("connection", (socket) => {
// //   // Users join a room specific to their godown for targeted alerts
// //   socket.on("join-godown", (godownId) => {
// //     socket.join(godownId);
// //     console.log(`User joined godown room: ${godownId}`);
// //   });

// //   // Admins join a global admin room for all alerts
// //   socket.on("join-admin", () => {
// //     socket.join("admins");
// //     console.log("Admin joined admins room");
// //   });
// // });

// // // 5. Connect DB and Listen
// // connectDB()
// //   .then(() => {
// //     const PORT = env.port || 5000;
// //     server.listen(PORT, () => {
// //       console.log(`✅ Backend running with Socket.io on port ${PORT}`);
// //       console.log(`✅ CORS enabled for port 5174 (Client) and 5173 (Admin)`);
// //     });
// //   })
// //   .catch((error) => {
// //     console.error("❌ DB connection failed", error);
// //     process.exit(1);
// //   });

// // // Export 'io' to use it inside your routes to emit events
// // export { io };





// // 4




// // 1. Load environment variables FIRST
// import 'dotenv/config'; 

// // 2. Import dependencies
// import http from "http";
// import { Server } from "socket.io";
// import { app } from "./app.js"; // This is your express app instance
// import { connectDB } from "./config/db.js";
// import { env } from "./config/env.js";

// // --- INTEGRATION: SERVER & SOCKET CONFIG ---

// // Create HTTP Server using the Express app
// const server = http.createServer(app);

// // Initialize Socket.io with correct CORS for your Admin (5173) and Client (5174)
// const io = new Server(server, { 
//   cors: { 
//     origin: ["http://localhost:5174", "http://localhost:5173"],
//     methods: ["GET", "POST"],
//     credentials: true // FIXED: This allows the browser to sync with the backend
//   } 
// });

// // --- SOCKET EVENT LOGIC ---

// io.on("connection", (socket) => {
//   // Users join a room specific to their godown for targeted inventory alerts
//   socket.on("join-godown", (godownId) => {
//     if (godownId) {
//       socket.join(godownId);
//       console.log(`📡 User joined Godown Room: ${godownId}`);
//     }
//   });

//   // Admins join a global admin room for system-wide notifications
//   socket.on("join-admin", () => {
//     socket.join("admins");
//     console.log("🛡️ Admin joined Admins Room");
//   });

//   socket.on("disconnect", () => {
//     console.log("🔌 User disconnected from socket");
//   });
// });

// // --- DATABASE & SERVER START ---

// connectDB()
//   .then(() => {
//     const PORT = env.port || 5000;
//     server.listen(PORT, () => {
//       console.log(`✅ DREAM Backend running on port ${PORT}`);
//       console.log(`🚀 Socket.io active & CORS allowed for Ports 5173/5174`);
//     });
//   })
//   .catch((error) => {
//     console.error("❌ DB connection failed:", error);
//     process.exit(1);
//   });

// // Export 'io' so you can use it in procurementRoutes.js to send real-time stock updates
// export { io };










// 13





// 1. Load environment variables FIRST
import 'dotenv/config'; 

// 2. Import dependencies
import http from "http";
import { Server } from "socket.io";
import { app } from "./app.js"; 
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

// --- 1. DEFINE YOUR ORIGINS (Matches your Render Environment) ---
// This ensures that both Express and Socket.io allow the same frontend URLs
const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(",") 
    : ["https://mkm-user.vercel.app", "https://mkm-self.vercel.app"];

// --- 2. INTEGRATION: SERVER & SOCKET CONFIG ---

// Create HTTP Server using the Express app
const server = http.createServer(app);

// Initialize Socket.io with dynamic CORS origins
const io = new Server(server, { 
  cors: { 
    origin: allowedOrigins, 
    methods: ["GET", "POST"],
    credentials: true 
  } 
});

// --- 3. SOCKET EVENT LOGIC ---

io.on("connection", (socket) => {
  // Users join a room specific to their godown for targeted inventory alerts
  socket.on("join-godown", (godownId) => {
    if (godownId) {
      socket.join(godownId);
      console.log(`📡 User joined Godown Room: ${godownId}`);
    }
  });

  // Admins join a global admin room for system-wide notifications
  socket.on("join-admin", () => {
    socket.join("admins");
    console.log("🛡️ Admin joined Admins Room");
  });

  socket.on("disconnect", () => {
    console.log("🔌 User disconnected from socket");
  });
});

// --- 4. DATABASE & SERVER START ---

connectDB()
  .then(() => {
    const PORT = env.port || 5000;
    server.listen(PORT, () => {
      console.log(`✅ DREAM Backend running on port ${PORT}`);
      console.log(`🚀 Socket.io active & CORS allowed for: ${allowedOrigins.join(", ")}`);
    });
  })
  .catch((error) => {
    console.error("❌ DB connection failed:", error);
    process.exit(1);
  });

// Export 'io' to use in routes (like procurementRoutes.js) for real-time updates
export { io };