import React from "react";

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className = "" }: CardProps) {
  return (
    <div className={`bg-white border border-gray-300 rounded flex flex-col ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-600 uppercase text-xs">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
