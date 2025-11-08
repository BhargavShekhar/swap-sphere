import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { Room } from './pages/Room'
import { Root } from './pages/Root'

const router = createBrowserRouter([
	{
		path: '/',
		element: <Root />,
	},
	{
		path: '/:roomId',
		element: <Room />,
	},
])

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
	<React.StrictMode>
		{/* @ts-expect-error - React Router type compatibility issue with React 18 types */}
		<RouterProvider router={router} />
	</React.StrictMode>
)
