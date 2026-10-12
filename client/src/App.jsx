import { Navigate, Route, Routes } from 'react-router-dom';
import GuestRoute from './components/auth/GuestRoute.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import ChatPage from './pages/ChatPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Only for logged-out visitors */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Requires a verified token. /chat is a new chat; /chat/:id is an existing one. */}
      <Route element={<ProtectedRoute />}>
        <Route path="/chat/:conversationId?" element={<ChatPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
