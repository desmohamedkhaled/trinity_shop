"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      active = false,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={[
          "inline-flex items-center justify-center rounded-full border border-transparent text-black/70 transition-all duration-200 hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5d3b2a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffaf3] disabled:cursor-not-allowed disabled:opacity-50",
          active ? "bg-[#f6f0e7] text-[#b84835] hover:bg-[#eadfce]" : "",
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);