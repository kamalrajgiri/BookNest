import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {Provider} from 'react-redux';
import {store} from './store/store';
import { sessionExpired } from './features/auth/authSlice.ts';
import { setSessionExpiredHandler } from './services/api.ts';
import './index.css';
import App from './App.tsx';

setSessionExpiredHandler(() => {
  store.dispatch(sessionExpired());
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
     <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
