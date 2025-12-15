import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordForm } from './ForgotPasswordForm';

// Mock auth provider
const mockResetPassword = jest.fn();
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    resetPassword: mockResetPassword,
  }),
}));

describe('ForgotPasswordForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockResetPassword.mockResolvedValue({ error: null });
  });

  it('renders forgot password form', () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wyslij link/i })).toBeInTheDocument();
  });

  it('allows entering email', async () => {
    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');

    expect(emailInput).toHaveValue('test@example.com');
  });

  it('calls resetPassword with email on submit', async () => {
    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /wyslij link/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows success message after successful submission', async () => {
    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /wyslij link/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/sprawdz swoja skrzynke/i)).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });
  });

  it('shows error message on failure', async () => {
    mockResetPassword.mockResolvedValue({
      error: { message: 'Some error' },
    });

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /wyslij link/i });

    await user.type(emailInput, 'invalid@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/wystapil blad/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    mockResetPassword.mockImplementation(() => new Promise(() => {}));

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /wyslij link/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/wysylanie/i)).toBeInTheDocument();
    });
  });

  it('disables button while loading', async () => {
    mockResetPassword.mockImplementation(() => new Promise(() => {}));

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /wyslij link/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });
});
