import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineEditableText } from './InlineEditableText';

describe('InlineEditableText', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.useFakeTimers();
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('commits trimmed value on Enter', async () => {
    const onCommit = jest.fn();
    render(<InlineEditableText value="Old" onCommit={onCommit} />);

    await user.click(screen.getByRole('button', { name: /old/i }));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '  New Name  ');
    await user.keyboard('{Enter}');

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(onCommit).toHaveBeenCalledWith('New Name');
  });

  it('commits on blur', async () => {
    const onCommit = jest.fn();
    render(<InlineEditableText value="Old" onCommit={onCommit} />);

    await user.click(screen.getByRole('button', { name: /old/i }));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Updated');
    act(() => {
      input.blur();
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(onCommit).toHaveBeenCalledWith('Updated');
  });

  it('cancels on Escape', async () => {
    const onCommit = jest.fn();
    const onCancel = jest.fn();
    render(<InlineEditableText value="Name" onCommit={onCommit} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /name/i }));
    const input = screen.getByRole('textbox');
    await user.type(input, 'Different');
    await user.keyboard('{Escape}');

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('ignores whitespace-only changes', async () => {
    const onCommit = jest.fn();
    render(<InlineEditableText value="Name" onCommit={onCommit} />);

    await user.click(screen.getByRole('button', { name: /name/i }));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '    ');
    await user.keyboard('{Enter}');

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('stops propagation when entering edit mode', async () => {
    const onWrapperClick = jest.fn();
    render(
      <div onClick={onWrapperClick}>
        <InlineEditableText value="Click me" onCommit={() => {}} />
      </div>
    );

    await user.click(screen.getByRole('button', { name: /click me/i }));
    expect(onWrapperClick).not.toHaveBeenCalled();
  });
});
