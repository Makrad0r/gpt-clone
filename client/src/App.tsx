import { Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "./pages/AuthPage";
import { ChatPage } from "./pages/ChatPage";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route path="/" element={<ChatPage />} />
      <Route path="/chat/:chatId" element={<ChatPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
