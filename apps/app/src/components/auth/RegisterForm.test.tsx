import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from './RegisterForm';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth provider
const mockSignUp = jest.fn();
const mockSignInWithGoogle = jest.fn();
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    signInWithGoogle: mockSignInWithGoogle,
    isLoading: false,
  }),
}));

describe('RegisterForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockSignUp.mockResolvedValue({ error: null });
    mockSignInWithGoogle.mockResolvedValue({ error: null });
  });

  it('renders registration form with all elements', () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText(/imie/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^haslo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/potwierdz haslo/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /akceptuje/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /chce otrzymywac/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zarejestruj/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  it('displays benefits of creating an account', () => {
    render(<RegisterForm />);

    expect(screen.getByText(/korzysci z konta/i)).toBeInTheDocument();
    expect(screen.getByText(/kredyty eksportu nigdy nie wygasaja/i)).toBeInTheDocument();
  });

  it('validates password matching', async () => {
    render(<RegisterForm />);

    const emailInput = screen.getByLabelText(/^email/i);
    const passwordInput = screen.getByLabelText(/^haslo/i);
    const confirmPasswordInput = screen.getByLabelText(/potwierdz haslo/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /akceptuje/i });
    const submitButton = screen.getByRole('button', { name: /zarejestruj/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'differentpassword');
    await user.click(termsCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/hasla nie sa identyczne/i)).toBeInTheDocument();
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('validates password minimum length', async () => {
    render(<RegisterForm />);

    const emailInput = screen.getByLabelText(/^email/i);
    const passwordInput = screen.getByLabelText(/^haslo/i);
    const confirmPasswordInput = screen.getByLabelText(/potwierdz haslo/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /akceptuje/i });
    const submitButton = screen.getByRole('button', { name: /zarejestruj/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'short');
    await user.type(confirmPasswordInput, 'short');
    await user.click(termsCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/haslo musi miec minimum 8 znakow/i)).toBeInTheDocument();
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('requires terms acceptance', async () => {
    render(<RegisterForm />);

    const emailInput = screen.getByLabelText(/^email/i);
    const passwordInput = screen.getByLabelText(/^haslo/i);
    const confirmPasswordInput = screen.getByLabelText(/potwierdz haslo/i);
    const submitButton = screen.getByRole('button', { name: /zarejestruj/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    // Don't check terms
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/musisz zaakceptowac regulamin/i)).toBeInTheDocument();
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUp with correct data on successful validation', async () => {
    render(<RegisterForm />);

    const nameInput = screen.getByLabelText(/imie/i);
    const emailInput = screen.getByLabelText(/^email/i);
    const passwordInput = screen.getByLabelText(/^haslo/i);
    const confirmPasswordInput = screen.getByLabelText(/potwierdz haslo/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /akceptuje/i });
    const newsletterCheckbox = screen.getByRole('checkbox', { name: /chce otrzymywac/i });
    const submitButton = screen.getByRole('button', { name: /zarejestruj/i });

    await user.type(nameInput, 'Jan Kowalski');
    await user.type(emailInput, 'jan@example.com');
    await user.type(passwordInput, 'securepass123');
    await user.type(confirmPasswordInput, 'securepass123');
    await user.click(termsCheckbox);
    await user.click(newsletterCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('jan@example.com', 'securepass123', {
        full_name: 'Jan Kowalski',
        newsletter_subscribed: true,
      });
    });
  });

  it('shows success message after successful registration', async () => {
    render(<RegisterForm />);

    const emailInput = screen.getByLabelText(/^email/i);
    const passwordInput = screen.getByLabelText(/^haslo/i);
    const confirmPasswordInput = screen.getByLabelText(/potwierdz haslo/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /akceptuje/i });
    const submitButton = screen.getByRole('button', { name: /zarejestruj/i });

    await user.type(emailInput, 'new@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(termsCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/sprawdz swoja skrzynke/i)).toBeInTheDocument();
      expect(screen.getByText(/new@example.com/i)).toBeInTheDocument();
    });
  });

  it('displays error for already registered email', async () => {
    mockSignUp.mockResolvedValue({
      error: { message: 'User already registered' },
    });

    render(<RegisterForm />);

    const emailInput = screen.getByLabelText(/^email/i);
    const passwordInput = screen.getByLabelText(/^haslo/i);
    const confirmPasswordInput = screen.getByLabelText(/potwierdz haslo/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /akceptuje/i });
    const submitButton = screen.getByRole('button', { name: /zarejestruj/i });

    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(termsCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/ten email jest juz zarejestrowany/i)).toBeInTheDocument();
    });
  });

  it('displays error for weak password from server', async () => {
    mockSignUp.mockResolvedValue({
      error: { message: 'Password too weak' },
    });

    render(<RegisterForm />);

    const emailInput = screen.getByLabelText(/^email/i);
    const passwordInput = screen.getByLabelText(/^haslo/i);
    const confirmPasswordInput = screen.getByLabelText(/potwierdz haslo/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /akceptuje/i });
    const submitButton = screen.getByRole('button', { name: /zarejestruj/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'weakpass');
    await user.type(confirmPasswordInput, 'weakpass');
    await user.click(termsCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/haslo jest za slabe/i)).toBeInTheDocument();
    });
  });

  it('calls signInWithGoogle on Google button click', async () => {
    render(<RegisterForm />);

    const googleButton = screen.getByRole('button', { name: /google/i });
    await user.click(googleButton);

    expect(mockSignInWithGoogle).toHaveBeenCalled();
  });

  it('allows navigation to login from success screen', async () => {
    render(<RegisterForm />);

    const emailInput = screen.getByLabelText(/^email/i);
    const passwordInput = screen.getByLabelText(/^haslo/i);
    const confirmPasswordInput = screen.getByLabelText(/potwierdz haslo/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /akceptuje/i });
    const submitButton = screen.getByRole('button', { name: /zarejestruj/i });

    await user.type(emailInput, 'new@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(termsCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/sprawdz swoja skrzynke/i)).toBeInTheDocument();
    });

    const loginButton = screen.getByRole('button', { name: /przejdz do logowania/i });
    await user.click(loginButton);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
