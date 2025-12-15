import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordForm } from './ResetPasswordForm';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth provider
const mockUpdatePassword = jest.fn();
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    updatePassword: mockUpdatePassword,
  }),
}));

describe('ResetPasswordForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockUpdatePassword.mockResolvedValue({ error: null });
  });

  it('renders reset password form', () => {
    render(<ResetPasswordForm />);

    expect(screen.getByLabelText(/nowe haslo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/potwierdz haslo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ustaw nowe haslo/i })).toBeInTheDocument();
  });

  it('allows entering passwords', async () => {
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText(/nowe haslo/i);
    const confirmInput = screen.getByLabelText(/potwierdz haslo/i);

    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmInput, 'newpassword123');

    expect(passwordInput).toHaveValue('newpassword123');
    expect(confirmInput).toHaveValue('newpassword123');
  });

  it('validates password matching', async () => {
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText(/nowe haslo/i);
    const confirmInput = screen.getByLabelText(/potwierdz haslo/i);
    const submitButton = screen.getByRole('button', { name: /ustaw nowe haslo/i });

    await user.type(passwordInput, 'password123');
    await user.type(confirmInput, 'differentpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/hasla nie sa identyczne/i)).toBeInTheDocument();
    });

    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('validates password minimum length', async () => {
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText(/nowe haslo/i);
    const confirmInput = screen.getByLabelText(/potwierdz haslo/i);
    const submitButton = screen.getByRole('button', { name: /ustaw nowe haslo/i });

    await user.type(passwordInput, 'short');
    await user.type(confirmInput, 'short');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/haslo musi miec minimum 8 znakow/i)).toBeInTheDocument();
    });

    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('calls updatePassword on valid submission', async () => {
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText(/nowe haslo/i);
    const confirmInput = screen.getByLabelText(/potwierdz haslo/i);
    const submitButton = screen.getByRole('button', { name: /ustaw nowe haslo/i });

    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmInput, 'newpassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('newpassword123');
    });
  });

  it('shows success message after successful password change', async () => {
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText(/nowe haslo/i);
    const confirmInput = screen.getByLabelText(/potwierdz haslo/i);
    const submitButton = screen.getByRole('button', { name: /ustaw nowe haslo/i });

    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmInput, 'newpassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/haslo zmienione/i)).toBeInTheDocument();
    });
  });

  it('allows navigation to login from success screen', async () => {
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText(/nowe haslo/i);
    const confirmInput = screen.getByLabelText(/potwierdz haslo/i);
    const submitButton = screen.getByRole('button', { name: /ustaw nowe haslo/i });

    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmInput, 'newpassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/haslo zmienione/i)).toBeInTheDocument();
    });

    const loginButton = screen.getByRole('button', { name: /przejdz do logowania/i });
    await user.click(loginButton);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('shows error message on failure', async () => {
    mockUpdatePassword.mockResolvedValue({
      error: { message: 'Update failed' },
    });

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText(/nowe haslo/i);
    const confirmInput = screen.getByLabelText(/potwierdz haslo/i);
    const submitButton = screen.getByRole('button', { name: /ustaw nowe haslo/i });

    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmInput, 'newpassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/wystapil blad podczas zmiany hasla/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    mockUpdatePassword.mockImplementation(() => new Promise(() => {}));

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText(/nowe haslo/i);
    const confirmInput = screen.getByLabelText(/potwierdz haslo/i);
    const submitButton = screen.getByRole('button', { name: /ustaw nowe haslo/i });

    await user.type(passwordInput, 'newpassword123');
    await user.type(confirmInput, 'newpassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/zapisywanie/i)).toBeInTheDocument();
    });
  });
});
