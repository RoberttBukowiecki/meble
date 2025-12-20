import { render, screen } from '@testing-library/react';
import Card from '@/components/ui/Card/Card';

describe('Card', () => {
  it('renders title correctly', () => {
    render(
      <Card title="Test Title">
        <span>Content</span>
      </Card>
    );

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'Test Title'
    );
  });

  it('renders description when provided', () => {
    render(
      <Card title="Title" description="Test description">
        <span>Content</span>
      </Card>
    );

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders children correctly', () => {
    render(
      <Card title="Title">
        <button>Click me</button>
      </Card>
    );

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <Card title="Title" footer={<span>Footer content</span>}>
        <span>Content</span>
      </Card>
    );

    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('does not render footer section when not provided', () => {
    render(
      <Card title="Title">
        <span>Content</span>
      </Card>
    );

    const footerElement = document.querySelector('.bg-zinc-900');
    expect(footerElement).not.toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(
      <Card title="Title">
        <span>Content</span>
      </Card>
    );

    const card = container.firstChild;
    expect(card).toHaveClass('w-full', 'max-w-3xl', 'm-auto', 'border', 'rounded-md');
  });
});
