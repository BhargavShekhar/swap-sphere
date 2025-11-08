import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import { Tldraw } from "@tldraw/tldraw";
import '@tldraw/tldraw/tldraw.css';
import { useSearchParams, useNavigate } from "react-router-dom";

export const WhiteBoard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const userA = searchParams.get('userA');
    const userB = searchParams.get('userB');
    
    // Create unique room ID from user IDs
    const roomId = userA && userB 
        ? `whiteboard-${userA}-${userB}` 
        : 'whiteboard-room';

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
            {/* Header with back button */}
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
                <button
                    onClick={() => navigate('/matching')}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                    ← Back to Matching
                </button>
            </div>
            
            <LiveblocksProvider publicApiKey="pk_dev_lx1VTmGizon0kxJgXU9hy6PNeRbays56S3RlB9Xd5ArMhDONjAWOaKMhdlMbMyRq">
                <RoomProvider id={roomId}>
                    <Tldraw licenseKey="tldraw-2026-02-15/WyI4TC0yU3RCbCIsWyIqIl0sMTYsIjIwMjYtMDItMTUiXQ.VyCsk4n3E+psesnVH2v9z9AUbpeUKAV72RaU93WR3ZPG8j5yycS5yRDEwmLIaVn2NRGrqzk7un0Od9wea0PQUg" />
                </RoomProvider>
            </LiveblocksProvider>
        </div>
    )
}