import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { AlertTriangle, Shield, MessageSquare, BarChart3, Users, TrendingUp } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/messages`, {
        content: inputMessage.trim()
      });
      
      const newMessage = response.data;
      setMessages(prev => [newMessage, ...prev]);
      setInputMessage("");
      
      if (newMessage.is_flagged) {
        toast.error(`🚨 Harassment Detected: ${newMessage.harassment_type?.replace('_', ' ').toUpperCase()}`, {
          description: newMessage.flagged_reason
        });
      } else {
        toast.success("✅ Message is safe", {
          description: `Safety score: ${(newMessage.safety_score * 100).toFixed(1)}%`
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error analyzing message");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Harassment Detection Chat</h2>
        <p className="text-gray-600">Type messages to test real-time harassment detection</p>
      </div>

      {/* Message Input */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message to analyze for harassment..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Analyzing..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Message History</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadMessages}
            className="gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {messages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No messages yet. Start by typing a message above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <Card key={message.id} className={`${message.is_flagged ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-gray-900 mb-2">{message.content}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{new Date(message.timestamp).toLocaleString()}</span>
                        <span>•</span>
                        <span>Safety: {(message.safety_score * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {message.is_flagged ? (
                        <>
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            FLAGGED
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {message.harassment_type?.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {message.flagged_reason && (
                            <p className="text-xs text-red-600 max-w-xs text-right">
                              {message.flagged_reason}
                            </p>
                          )}
                        </>
                      ) : (
                        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
                          <Shield className="w-3 h-3" />
                          SAFE
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Error loading analytics");
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = async () => {
    try {
      await axios.delete(`${API}/messages`);
      toast.success("All messages cleared");
      loadAnalytics();
    } catch (error) {
      console.error("Error clearing messages:", error);
      toast.error("Error clearing messages");
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Error loading analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
          <p className="text-gray-600">Monitor harassment detection statistics and trends</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={loadAnalytics}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Refresh
          </Button>
          <Button 
            variant="destructive" 
            onClick={clearMessages}
            className="gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.total_messages}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Flagged Messages</p>
                <p className="text-2xl font-bold text-red-600">{analytics.flagged_messages}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Safety Rate</p>
                <p className="text-2xl font-bold text-green-600">{analytics.safety_percentage}%</p>
              </div>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Risk Level</p>
                <p className={`text-2xl font-bold ${analytics.safety_percentage > 80 ? 'text-green-600' : analytics.safety_percentage > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {analytics.safety_percentage > 80 ? 'LOW' : analytics.safety_percentage > 60 ? 'MEDIUM' : 'HIGH'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Harassment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Harassment Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.harassment_breakdown).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{category}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-red-500 rounded-full transition-all duration-300"
                        style={{ 
                          width: analytics.flagged_messages > 0 ? `${(count / analytics.flagged_messages) * 100}%` : '0%' 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Recent Flagged Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {analytics.recent_flagged_messages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No flagged messages yet</p>
              ) : (
                analytics.recent_flagged_messages.map((message) => (
                  <div key={message.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-gray-900 mb-2">{message.content}</p>
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="destructive" className="text-xs">
                        {message.harassment_type?.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-gray-500">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App min-h-screen bg-gray-50">
      <BrowserRouter>
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">HarassmentShield AI</h1>
                <p className="text-sm text-gray-600">Real-time harassment detection platform</p>
              </div>
            </div>
          </div>
        </div>

        <div className="py-8">
          <Tabs defaultValue="chat" className="max-w-6xl mx-auto px-6">
            <TabsList className="grid grid-cols-2 w-full max-w-md mb-8">
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat Interface
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat">
              <ChatInterface />
            </TabsContent>

            <TabsContent value="analytics">
              <Analytics />
            </TabsContent>
          </Tabs>
        </div>

        <Toaster position="top-right" />
      </BrowserRouter>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <Shield className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="font-semibold">HarassmentShield AI</h3>
                <p className="text-sm text-gray-400">Real-time harassment detection platform</p>
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-sm text-gray-400 mb-1">Powered by AI • Built for Safety</p>
              <p className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Created by ROYAL HACKERS
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-6 pt-4">
            <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
              <p>&copy; 2025 HarassmentShield AI. Protecting communities worldwide.</p>
              <div className="flex items-center gap-4 mt-2 md:mt-0">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Safe Communities
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  AI-Powered
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;