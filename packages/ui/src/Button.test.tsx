import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    const handleClick = jest.fn();
    render(<Button loading onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('sets aria-disabled when disabled', () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('sets aria-busy when loading', () => {
    render(<Button loading>Click</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('applies aria-label for icon-only buttons', () => {
    render(<Button aria-label="Add item">+</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Add item');
  });

  it('renders leftSection when not loading', () => {
    render(<Button leftSection={<span data-testid="icon">I</span>}>Click</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders rightSection when not loading', () => {
    render(<Button rightSection={<span data-testid="icon">I</span>}>Click</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('hides leftSection when loading', () => {
    render(<Button loading leftSection={<span data-testid="icon">I</span>}>Click</Button>);
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });

  it('defaults to type="button"', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('supports custom type', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('applies fullWidth style', () => {
    render(<Button fullWidth>Click</Button>);
    expect(screen.getByRole('button')).toHaveStyle({ width: '100%' });
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="xs">Click</Button>);
    expect(screen.getByRole('button')).toHaveStyle({ padding: '4px 8px', fontSize: '12px' });

    rerender(<Button size="xl">Click</Button>);
    expect(screen.getByRole('button')).toHaveStyle({ padding: '14px 28px', fontSize: '20px' });
  });

  it('applies custom style prop', () => {
    render(<Button style={{ marginTop: 10 }}>Click</Button>);
    expect(screen.getByRole('button')).toHaveStyle({ marginTop: 10 });
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Click</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
