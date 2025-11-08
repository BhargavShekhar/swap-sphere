import { Route, Routes } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import { Home } from "./components/Home"
import { VidioCall } from "./components/VidioCall"
import { WhiteBoard } from "./components/WhiteBoard"
import { MatchingDashboard } from "./pages/MatchingDashboard"
import { Login } from "./pages/Login"
import { Signup } from "./pages/Signup"
import { Chat } from "./pages/Chat"

function App() {

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/call" element={<VidioCall />} />
        <Route path="/white-board" element={<WhiteBoard />} />
        <Route path="/matching" element={<MatchingDashboard />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
