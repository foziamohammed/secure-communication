# Secure Communication Platform

A secure real-time messaging application featuring end-to-end encryption and WebSocket communication.

## Features

- 🔒 End-to-End Encryption using AES-256
- 🌐 Real-time messaging via WebSockets
- 🔑 JWT Authentication for secure access
- 📦 Message persistence with MongoDB
- 🔄 Auto-reconnect for dropped connections
- 📱 Responsive UI works on all devices

## Security Implementation

### Encryption
- AES-256 symmetric encryption
- Unique IV (Initialization Vector) per message
- Encrypted message format: ciphertext:iv

### Authentication
- JWT token-based authentication
- Token expiration (1 hour)
- Secure WebSocket handshake

## Prerequisites

- Node.js (v16+ recommended)
- MongoDB (v4.4+)
- npm or yarn

