import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges class names and resolves Tailwind conflicts', () => {
    const result = cn('px-2', 'px-4', { hidden: false, flex: true, 'text-lg': true });

    expect(result).toBe('px-4 flex text-lg');
  });

  it('ignores falsy values', () => {
    const result = cn('p-2', null, undefined, false, '');

    expect(result).toBe('p-2');
  });
});
