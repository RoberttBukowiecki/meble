import { render, screen } from '@testing-library/react';
import { SectionTitle } from '@/components/SectionTitle';

describe('SectionTitle', () => {
  it('renders with title key', () => {
    render(<SectionTitle titleKey="test.title" />);

    // The mock returns the key as the text
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'test.title'
    );
  });

  it('renders pretitle when provided', () => {
    render(<SectionTitle pretitleKey="test.pretitle" titleKey="test.title" />);

    expect(screen.getByText('test.pretitle')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <SectionTitle
        titleKey="test.title"
        descriptionKey="test.description"
      />
    );

    expect(screen.getByText('test.description')).toBeInTheDocument();
  });

  it('applies center alignment by default', () => {
    render(<SectionTitle titleKey="test.title" />);

    const container = screen.getByRole('heading', { level: 2 }).closest('div');
    expect(container).toHaveClass('items-center', 'justify-center', 'text-center');
  });

  it('applies left alignment when specified', () => {
    render(<SectionTitle titleKey="test.title" align="left" />);

    const container = screen.getByRole('heading', { level: 2 }).closest('div');
    expect(container).not.toHaveClass('items-center');
  });

  it('applies id to heading when provided', () => {
    render(<SectionTitle titleKey="test.title" id="custom-id" />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute(
      'id',
      'custom-id'
    );
  });

  it('does not render pretitle when not provided', () => {
    render(<SectionTitle titleKey="test.title" />);

    const pretitleElement = document.querySelector('.text-indigo-600');
    expect(pretitleElement).not.toBeInTheDocument();
  });
});
