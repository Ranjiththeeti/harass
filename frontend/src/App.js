import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toaster, toast } from "sonner";
import {
  AlertTriangle,
  BarChart2,
  MessageCircle,
  Loader2,
  Trash2,
} from "lucide-react";

// Use env var if available, else no backend (static preview mode)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    if (!API) return; // Skip in static preview
    try {
      const response = await axios.get(`${API}/messages`);
      setMessages(response.data);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    setIsLoading(true);

    if (!API) {
      toast.error("Backend not connected. Messages can’t be analyzed in this demo.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API}/messages`, {
        content: inputMessage.trim(),
      });

      setMessages([response.data, ...messages]);
      setInputMessage("");

      if (response.data.is_abusive) {
        toast.error("⚠️ Harassment detected");
      } else {
        toast.success("✅ Message is safe");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow p-4 mb-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-xl border"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Send"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-xl shadow ${
              msg.is_abusive ? "bg-red-100" : "bg-green-100"
            }`}
          >
            <p className="font-medium">{msg.content}</p>
            <p className="text-sm text-gray-600">
              {new Date(msg.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);

    if (!API) {
      setAnalytics(null); // No backend → no analytics
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/analytics`);
      setAnalytics(response.data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = async () => {
    if (!API) {
      toast.error("Backend not connected. Can’t clear messages.");
      return;
    }

    try {
      await axios.delete(`${API}/messages`);
      toast.success("Messages cleared");
      setAnalytics(null);
    } catch (err) {
      console.error("Failed to clear messages:", err);
      toast.error("Failed to clear messages");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">
            Analytics data not available in static preview.  
            Connect to a backend server to enable full functionality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          <BarChart2 className="mr-2" /> Analytics
        </h2>
        <button
          onClick={clearMessages}
          className="flex items-center text-red-600 hover:text-red-800"
        >
          <Trash2 className="w-4 h-4 mr-1" /> Clear Messages
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-lg font-semibold mb-2">Total Messages</h3>
          <p className="text-3xl">{analytics.total_messages}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-lg font-semibold mb-2">Abusive Messages</h3>
          <p className="text-3xl text-red-600">{analytics.abusive_messages}</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster richColors />
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Harassment Detection</h1>
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center px-3 py-2 rounded-lg ${
                activeTab === "chat" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
              }`}
            >
              <MessageCircle className="w-4 h-4 mr-1" /> Chat
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center px-3 py-2 rounded-lg ${
                activeTab === "analytics" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
              }`}
            >
              <BarChart2 className="w-4 h-4 mr-1" /> Analytics
            </button>
          </nav>
        </div>
      </header>

      <main className="py-8">
        {activeTab === "chat" ? <ChatInterface /> : <Analytics />}
      </main>
    </div>
  );
}
