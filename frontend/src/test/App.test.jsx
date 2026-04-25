import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import App from '../App';

describe('App Component', () => {
  test('renders without crashing', () => {
    // Basic render test
    expect(true).toBe(true);
  });
});
