import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

// Mock next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock auth provider
const mockSignIn = jest.fn();
const mockSignInWithGoogle = jest.fn();
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signInWithGoogle: mockSignInWithGoogle,
    isLoading: false,
  }),
}));

describe('LoginForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
    mockSignInWithGoogle.mockResolvedValue({ error: null });
  });

  it('renders login form with all elements', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('********')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zaloguj/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByText(/zapomnialesz hasla/i)).toBeInTheDocument();
  });

  it('allows entering email and password', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText('********');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls signIn with correct credentials on form submit', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText('********');
    const submitButton = screen.getByRole('button', { name: /zaloguj/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('redirects on successful login', async () => {
    render(<LoginForm redirectTo="/dashboard" />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText('********');
    const submitButton = screen.getByRole('button', { name: /zaloguj/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('redirects to home by default on successful login', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText('********');
    const submitButton = screen.getByRole('button', { name: /zaloguj/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('displays error for invalid credentials', async () => {
    mockSignIn.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText('********');
    const submitButton = screen.getByRole('button', { name: /zaloguj/i });

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpass');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nieprawidlowy email lub haslo/i)).toBeInTheDocument();
    });
  });

  it('displays error for unconfirmed email', async () => {
    mockSignIn.mockResolvedValue({
      error: { message: 'Email not confirmed' },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText('********');
    const submitButton = screen.getByRole('button', { name: /zaloguj/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/potwierdz swoj email/i)).toBeInTheDocument();
    });
  });

  it('displays initial error message from props', () => {
    render(<LoginForm errorMessage="Sesja wygasla" />);

    expect(screen.getByText(/sesja wygasla/i)).toBeInTheDocument();
  });

  it('calls signInWithGoogle on Google button click', async () => {
    render(<LoginForm />);

    const googleButton = screen.getByRole('button', { name: /google/i });
    await user.click(googleButton);

    expect(mockSignInWithGoogle).toHaveBeenCalled();
  });

  it('displays error when Google sign-in fails', async () => {
    mockSignInWithGoogle.mockResolvedValue({
      error: { message: 'OAuth error' },
    });

    render(<LoginForm />);

    const googleButton = screen.getByRole('button', { name: /google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText(/blad podczas logowania przez google/i)).toBeInTheDocument();
    });
  });

  it('disables buttons while loading', async () => {
    // Make signIn hang to simulate loading
    mockSignIn.mockImplementation(() => new Promise(() => {}));

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText('********');
    const submitButton = screen.getByRole('button', { name: /zaloguj/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/logowanie\.\.\./i)).toBeInTheDocument();
    });
  });

  it('has link to forgot password page', () => {
    render(<LoginForm />);

    const forgotPasswordLink = screen.getByRole('link', { name: /zapomnialesz hasla/i });
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  it('has links to terms and privacy policy', () => {
    render(<LoginForm />);

    expect(screen.getByRole('link', { name: /regulamin/i })).toHaveAttribute(
      'href',
      '/regulamin'
    );
    expect(screen.getByRole('link', { name: /polityke prywatnosci/i })).toHaveAttribute(
      'href',
      '/polityka-prywatnosci'
    );
  });
});
