import React from "react";
import logoImg from "@assets/hexauth_1780209078520.jpg";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

export function Logo({ className = "", size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={logoImg}
        alt="Hex Auth Logo"
        className={`${sizeClasses[size]} rounded object-cover shadow-sm ring-1 ring-white/10`}
      />
      {showText && (
        <span className="font-bold tracking-tight text-foreground">
          HEX<span className="text-primary">AUTH</span>
        </span>
      )}
    </div>
  );
}
