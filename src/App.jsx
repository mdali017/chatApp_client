import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';

let socket;

export default function App() {
  const { auth, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [room, setRoom] = useState('general');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (auth) {
      socket = io('http://localhost:3000', {
        auth: { token: auth.token }
      });

      socket.on('connect_error', (err) => {
        if (err.message === 'Authentication required') {
          logout();
        }
      });

      socket.emit('join_room', room);

      socket.on('message', (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      });

      // Fetch existing messages
      fetchMessages();

      return () => {
        socket.disconnect();
      };
    }
  }, [auth, room]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/messages?room=${room}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && socket) {
      socket.emit('message', { message: inputMessage, room });
      setInputMessage('');
    }
  };

  if (!auth) {
    return <Login />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="p-4 bg-white shadow flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Chat App</h1>
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">
            Logged in as {auth.user.username} ({auth.user.role})
          </span>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      {auth.user.role === 'admin' && (
        <div className="p-4 bg-white border-b">
          <h2 className="font-semibold mb-2">Admin Panel</h2>
          <p className="text-sm text-gray-600">Viewing all conversations</p>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`flex ${msg.sender.username === auth.user.username ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                msg.sender.username === auth.user.username
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <p className="text-sm font-semibold">{msg.sender.username}</p>
              <p>{msg.content}</p>
              <span className="text-xs opacity-75">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <form onSubmit={sendMessage} className="p-4 bg-white border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}