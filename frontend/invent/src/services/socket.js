/**
 * socket.js — Singleton Socket.IO client.
 * Auth token sourced from in-memory store (api.js), not localStorage.
 */
import { io }            from "socket.io-client";
import { getAccessToken } from "./api";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3000";

let socket = null;

export function getSocket() {
  if (socket && socket.connected) return socket;

  const token = getAccessToken();
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth:                 { token },
    transports:           ["websocket", "polling"],
    autoConnect:          true,
    reconnection:         true,
    reconnectionDelay:    2000,
    reconnectionAttempts: 5,
  });

  socket.on("connect_error", (err) => {
    console.warn("[Socket] connection error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

export function connectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
  return getSocket();
}

export function isSocketConnected() {
  return !!(socket && socket.connected);
}
