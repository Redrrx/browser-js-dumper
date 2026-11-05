import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { installAPI } from '../application/app';

installAPI();

const root = document.getElementById('root');
if (!root) throw new Error('Missing candidate application root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
