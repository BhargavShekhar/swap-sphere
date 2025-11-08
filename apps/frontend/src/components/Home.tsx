import { Link } from "react-router-dom"

export const Home = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
            <div className="text-center space-y-8 max-w-3xl">
                <div>
                    <h1 className="text-6xl font-bold text-gray-900 mb-4">Swap Sphere</h1>
                    <p className="text-2xl text-gray-700 mb-2">
                        Peer-to-Peer Skill Exchange Platform
                    </p>
                    <p className="text-lg text-gray-600 mb-8">
                        Share what you master. Learn what you need. No fees. No complexity.
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        How It Works
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        <div>
                            <div className="text-3xl mb-2">📝</div>
                            <h3 className="font-semibold text-gray-900 mb-2">1. Create Your Profile</h3>
                            <p className="text-gray-600 text-sm">
                                List <strong>one skill</strong> you can teach and <strong>one skill</strong> you want to learn.
                            </p>
                        </div>
                        <div>
                            <div className="text-3xl mb-2">🔍</div>
                            <h3 className="font-semibold text-gray-900 mb-2">2. Find Perfect Matches</h3>
                            <p className="text-gray-600 text-sm">
                                Our intelligent algorithm matches you with users who want what you offer and offer what you want.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/signup"
                        className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg shadow-lg transition-all transform hover:scale-105"
                    >
                        Get Started →
                    </Link>
                    <Link
                        to="/login"
                        className="px-8 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium shadow-lg transition-all"
                    >
                        Login
                    </Link>
                    <Link
                        to="/call"
                        className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-lg transition-all"
                    >
                        Video Call
                    </Link>
                    <Link
                        to="/white-board"
                        className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium shadow-lg transition-all"
                    >
                        Whiteboard
                    </Link>
                </div>
            </div>
        </div>
    )
}