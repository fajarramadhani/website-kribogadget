import * as React from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border border-line bg-paper px-3.5 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-ink focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:bg-canvas aria-[invalid=true]:border-danger";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(control, "h-11", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(control, "min-h-24 py-2.5", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(control, "h-11 appearance-none bg-[length:1rem] pr-9", className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

/** Label + kontrol + pesan error/hint yang terhubung secara aksesibel. */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string | string[];
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-accent-dark" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !message && <p className="text-xs text-muted">{hint}</p>}
      {message && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
