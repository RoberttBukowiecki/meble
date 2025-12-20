import { render, screen, fireEvent } from '@testing-library/react';
import Button from '@/components/ui/Button/Button';

// Mock the CSS module
jest.mock('@/components/ui/Button/Button.module.css', () => ({
  root: 'root',
  slim: 'slim',
  loading: 'loading',
  disabled: 'disabled',
}));

// Mock LoadingDots component
jest.mock('@/components/ui/LoadingDots', () => ({
  __esModule: true,
  default: () => <span data-testid="loading-dots">...</span>,
}));

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies disabled state correctly', () => {
    render(<Button disabled>Disabled Button</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading indicator when loading', () => {
    render(<Button loading>Loading</Button>);

    expect(screen.getByTestId('loading-dots')).toBeInTheDocument();
  });

  it('does not show loading indicator when not loading', () => {
    render(<Button>Not Loading</Button>);

    expect(screen.queryByTestId('loading-dots')).not.toBeInTheDocument();
  });

  it('applies variant data attribute', () => {
    render(<Button variant="slim">Slim Button</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'slim');
  });

  it('applies custom width style', () => {
    render(<Button width={200}>Wide Button</Button>);

    expect(screen.getByRole('button')).toHaveStyle({ width: '200px' });
  });

  it('sets aria-pressed when active', () => {
    render(<Button active>Active Button</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('spreads additional props to button element', () => {
    render(<Button data-testid="custom-button">Test</Button>);

    expect(screen.getByTestId('custom-button')).toBeInTheDocument();
  });
});
