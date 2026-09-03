import type { ButtonHTMLAttributes } from 'react';

// This is the "component composition instead of long className strings" pattern — rather than
// every page repeating the same rounded/padding/color utility classes on every <button>, they all
// import this once and just pick a variant.
type ButtonVariant = 'primary' | 'secondary' | 'danger';

// Shared base look every button will get
const baseClassName =
  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const variantClassNames: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-500',
  secondary: 'bg-gray-800 text-gray-100 hover:bg-gray-700',
  danger: 'bg-red-900 text-red-100 hover:bg-red-800',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

// Primary button styling by default if variant not specified
// ... for the rest of the props other than variant and className being passed from button component being used
// Destructuring variant and className to keep the HTML clean with actual button elements instead of having user defined
// stuff like variant in there
function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseClassName} ${variantClassNames[variant]} ${className}`}
      {...props}
    />
  );
}

export default Button;
