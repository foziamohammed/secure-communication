import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';

function App() {
  // Configuration (should use environment variables in production)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
  
  // Warning: In production, use proper key exchange instead of hardcoded key!
  const DEFAULT_SHARED_KEY_HEX = import.meta.env.VITE_KEY_HEX || 
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  // State management
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [receiver, setReceiver] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [status, setStatus] = useState('disconnected'); // 'connecting', 'connected', 'error'
  const [error, setError] = useState(null);

  // Refs for persistent values
  const wsRef = useRef(null);
  const sharedKeyRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // WebSocket management
  const connectWebSocket = (token) => {
    setStatus('connecting');
    setError(null);

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      sharedKeyRef.current = CryptoJS.enc.Hex.parse(DEFAULT_SHARED_KEY_HEX);
      setStatus('connected');
      reconnectAttemptRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { sender, encryptedContent } = data;
        
        if (!sharedKeyRef.current) {
          throw new Error('Encryption key not available');
        }

        const [encrypted, ivHex] = encryptedContent.split(':');
        if (!encrypted || !ivHex) {
          throw new Error('Invalid message format');
        }

        const iv = CryptoJS.enc.Hex.parse(ivHex);
        const decrypted = CryptoJS.AES.decrypt(encrypted, sharedKeyRef.current, { iv });
        const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

        if (!decryptedText) {
          throw new Error('Decryption failed');
        }

        setMessages((prev) => [...prev, { sender, content: decryptedText }]);
      } catch (err) {
        console.error('Message handling error:', err);
        setMessages((prev) => [...prev, 
          { sender: 'System', content: `[Could not decrypt message: ${err.message}]` }
        ]);
      }
    };

    ws.onclose = () => {
      if (status !== 'error') {
        console.log('WebSocket disconnected - attempting reconnect');
        attemptReconnect(token);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('error');
      setError('Connection failed. Please refresh the page.');
    };
  };

  const attemptReconnect = (token) => {
    if (reconnectAttemptRef.current >= 3) {
      setStatus('error');
      setError('Failed to reconnect. Please refresh the page.');
      return;
    }

    reconnectAttemptRef.current += 1;
    setTimeout(() => connectWebSocket(token), 1000 * reconnectAttemptRef.current);
  };

  // API functions
  const register = async () => {
    try {
      setError(null);
      await axios.post(`${API_URL}/register`, { username, password });
      alert('Registration successful! Please login.');
      setIsRegistering(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  const login = async () => {
    try {
      setError(null);
      const res = await axios.post(`${API_URL}/login`, { username, password });
      setToken(res.data.token);
      connectWebSocket(res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  // Message handling
  const sendMessage = () => {
    if (!wsRef.current || status !== 'connected') {
      setError('Connection not ready');
      return;
    }

    if (!receiver) {
      setError('Please enter a recipient');
      return;
    }

    try {
      const iv = CryptoJS.lib.WordArray.random(16);
      const encrypted = CryptoJS.AES.encrypt(message, sharedKeyRef.current, { iv }).toString();
      const encryptedContent = `${encrypted}:${iv.toString(CryptoJS.enc.Hex)}`;
      
      wsRef.current.send(JSON.stringify({ receiver, encryptedContent }));
      setMessages((prev) => [...prev, { sender: username, content: message }]);
      setMessage('');
      setError(null);
    } catch (err) {
      console.error('Send error:', err);
      setError('Failed to send message');
    }
  };

  // UI helpers
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const connectionStatus = {
    disconnected: '🔴 Disconnected',
    connecting: '🟡 Connecting...',
    connected: '🟢 Connected',
    error: '🔴 Connection Error'
  }[status];

  return (
    <div className="max-w-md mx-auto mt-10 p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Secure Chat</h1>
      
      {!token ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl mb-4 text-center">
            {isRegistering ? 'Register' : 'Login'}
          </h2>
          
          {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
          
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 mb-3 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 mb-4 border rounded"
          />
          
          <div className="flex space-x-2">
            <button
              onClick={isRegistering ? register : login}
              className={`flex-1 p-2 text-white rounded ${
                isRegistering ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isRegistering ? 'Register' : 'Login'}
            </button>
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="flex-1 p-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
            >
              {isRegistering ? 'Back to Login' : 'Register'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Chatting as: {username}</h2>
            <div className="text-sm">{connectionStatus}</div>
          </div>
          
          {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
          
          <input
            type="text"
            placeholder="Send to (username)"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            className="w-full p-2 mb-3 border rounded"
            disabled={status !== 'connected'}
          />
          
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 p-2 border rounded"
              disabled={status !== 'connected'}
            />
            <button
              onClick={sendMessage}
              disabled={status !== 'connected'}
              className={`p-2 px-4 text-white rounded ${
                status === 'connected' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'
              }`}
            >
              Send
            </button>
          </div>
          
          <div className="border rounded-lg p-3 h-64 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-gray-500 text-center mt-20">No messages yet</div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`mb-2 p-2 rounded ${
                    msg.sender === username
                      ? 'bg-blue-100 ml-auto text-right'
                      : msg.sender === 'System'
                      ? 'bg-yellow-100 text-center'
                      : 'bg-gray-100 mr-auto'
                  }`}
                >
                  <div className="font-semibold text-sm">
                    {msg.sender === username ? 'You' : msg.sender}
                  </div>
                  <div>{msg.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {token && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Note: This demo uses a hardcoded encryption key. In production, implement proper key exchange.
        </div>
      )}
    </div>
  );
}

export default App; 
