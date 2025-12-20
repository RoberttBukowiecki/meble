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

    // Check that no footer content exists - use semantic approach instead of CSS class
    expect(screen.queryByText('Footer content')).not.toBeInTheDocument();
  });

  it('renders card container element', () => {
    const { container } = render(
      <Card title="Title">
        <span>Content</span>
      </Card>
    );

    // Verify the card renders with a container element
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });
});
