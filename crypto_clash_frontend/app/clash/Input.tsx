import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = "", ...props }: Readonly<InputProps>) {
  const baseClasses = "rounded-md border-0 px-3 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-white/5 dark:ring-white/10 dark:focus:ring-indigo-500";
  
  return <input className={`${baseClasses} ${className}`} {...props} />;
}
