import React, { forwardRef, useCallback } from 'react';

/** Mantine-compatible color names */
export type ButtonColor =
  | 'blue'
  | 'red'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'teal'
  | 'cyan'
  | 'grape'
  | 'violet'
  | 'pink'
  | 'gray'
  | 'dark';

/** Button size variants */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Button variant styles */
export type ButtonVariant = 'filled' | 'light' | 'outline' | 'subtle' | 'default';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Button color */
  color?: ButtonColor;
  /** Button size */
  size?: ButtonSize;
  /** Button variant */
  variant?: ButtonVariant;
  /** Full width button */
  fullWidth?: boolean;
  /** Left icon/element */
  leftSection?: React.ReactNode;
  /** Right icon/element */
  rightSection?: React.ReactNode;
  /** Accessible label for icon-only buttons */
  'aria-label'?: string;
}

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  xs: { padding: '4px 8px', fontSize: '12px' },
  sm: { padding: '6px 12px', fontSize: '14px' },
  md: { padding: '10px 20px', fontSize: '16px' },
  lg: { padding: '12px 24px', fontSize: '18px' },
  xl: { padding: '14px 28px', fontSize: '20px' },
};

const COLOR_MAP: Record<ButtonColor, string> = {
  blue: '#228be6',
  red: '#fa5252',
  green: '#40c057',
  yellow: '#fab005',
  orange: '#fd7e14',
  teal: '#12b886',
  cyan: '#15aabf',
  grape: '#be4bdb',
  violet: '#7950f2',
  pink: '#e64980',
  gray: '#868e96',
  dark: '#343a40',
};

/**
 * A flexible button component with proper accessibility support
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      onClick,
      disabled = false,
      loading = false,
      color = 'blue',
      size = 'md',
      variant = 'filled',
      fullWidth = false,
      leftSection,
      rightSection,
      type = 'button',
      'aria-label': ariaLabel,
      style,
      ...rest
    },
    ref
  ) => {
    const handleClick = useCallback(() => {
      if (!disabled && !loading && onClick) {
        try {
          onClick();
        } catch (error) {
          // Prevent unhandled errors from propagating
          console.error('Button onClick error:', error);
        }
      }
    }, [disabled, loading, onClick]);

    const baseColor = COLOR_MAP[color] || COLOR_MAP.blue;

    const getVariantStyles = (): React.CSSProperties => {
      switch (variant) {
        case 'filled':
          return {
            backgroundColor: baseColor,
            color: '#ffffff',
            border: 'none',
          };
        case 'light':
          return {
            backgroundColor: `${baseColor}20`,
            color: baseColor,
            border: 'none',
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            color: baseColor,
            border: `1px solid ${baseColor}`,
          };
        case 'subtle':
          return {
            backgroundColor: 'transparent',
            color: baseColor,
            border: 'none',
          };
        case 'default':
        default:
          return {
            backgroundColor: '#f1f3f5',
            color: '#343a40',
            border: '1px solid #dee2e6',
          };
      }
    };

    const buttonStyle: React.CSSProperties = {
      ...SIZE_STYLES[size],
      ...getVariantStyles(),
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      borderRadius: '4px',
      fontWeight: 500,
      transition: 'background-color 0.2s, opacity 0.2s',
      width: fullWidth ? '100%' : 'auto',
      ...style,
    };

    return (
      <button
        ref={ref}
        type={type}
        onClick={handleClick}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        aria-label={ariaLabel}
        style={buttonStyle}
        {...rest}
      >
        {loading && (
          <span aria-hidden="true" style={{ marginRight: '4px' }}>
            ⏳
          </span>
        )}
        {!loading && leftSection && <span aria-hidden="true">{leftSection}</span>}
        {children}
        {!loading && rightSection && <span aria-hidden="true">{rightSection}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
