import { render, screen } from '@testing-library/react';
import { Container } from '@/components/Container';

describe('Container', () => {
  it('renders children correctly', () => {
    render(
      <Container>
        <span>Test content</span>
      </Container>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies default container classes', () => {
    render(
      <Container>
        <span>Content</span>
      </Container>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('container', 'p-8', 'mx-auto', 'xl:px-0');
  });

  it('applies additional className when provided', () => {
    render(
      <Container className="custom-class">
        <span>Content</span>
      </Container>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('handles empty className', () => {
    render(
      <Container className="">
        <span>Content</span>
      </Container>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toBeInTheDocument();
  });
});
