import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { toLocalDate } from './lib/dates.ts';
import { createLocalStorageRepository } from './storage/localStorageBackend.ts';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

// The app's only clock read. Everything below takes "today" as a value.
const today = toLocalDate(new Date());
const repository = createLocalStorageRepository();
// Started outside React so StrictMode's double render can't load (and seed) twice.
const loaded = repository.load(today);

createRoot(root).render(
  <StrictMode>
    <App today={today} loaded={loaded} />
  </StrictMode>,
);
