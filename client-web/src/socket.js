import { io } from 'socket.io-client';

// Use your backend URL. 
// "autoConnect: false" allows us to manually connect in App.jsx only after login.
const URL = "http://localhost:5000"; 

export const socket = io(URL, {
  autoConnect: false,
  withCredentials: true
});