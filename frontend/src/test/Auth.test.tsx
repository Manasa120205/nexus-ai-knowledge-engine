import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { AuthProvider } from '../context/AuthContext';

describe('Authentication Components', () => {
  it('renders clean real-user login form without demo buttons', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Sign in to NEXUS/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@company.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    // Confirms demo buttons are completely removed from production
    expect(screen.queryByText(/demo/i)).not.toBeInTheDocument();
  });

  it('renders real-user registration form with required fields and password confirmation', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Create your NEXUS account/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/At least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Re-enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
  });
});
