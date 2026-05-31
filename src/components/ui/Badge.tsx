import React from "react";

export type BadgeVariant = "success" | "error" | "warning" | "info" | "default";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  let variantClasses = "";

  switch (variant) {
    case "success":
      variantClasses = "bg-green-100 text-green-700 border-green-200";
      break;
    case "error":
      variantClasses = "bg-red-100 text-red-700 border-red-200";
      break;
    case "warning":
      variantClasses = "bg-amber-100 text-amber-700 border-amber-200";
      break;
    case "info":
      variantClasses = "bg-blue-100 text-blue-700 border-blue-200";
      break;
    case "default":
    default:
      variantClasses = "bg-gray-100 text-gray-700 border-gray-200";
      break;
  }

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold border ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
}
