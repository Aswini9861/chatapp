import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import './App.css'
import {store} from './context/store.jsx'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom";
import AuthProvider from './context/authProvider.jsx';
import { WebSocketProvider } from './context/WebSocketContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
  <Provider store={store}>
  <AuthProvider>
  <WebSocketProvider>
  <BrowserRouter>
    <App />
    </BrowserRouter>
    </WebSocketProvider>
    </AuthProvider>
    </Provider>
  </StrictMode>,
)
