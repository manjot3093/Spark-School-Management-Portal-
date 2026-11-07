import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { applyTheme, readTheme } from './utils/theme';
import './theme.css';

applyTheme(readTheme());

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
); 