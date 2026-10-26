"use client";

import * as React from "react";

export function DashboardCardVisual({
  className,
  style,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      style={style}
      fill="none"
      {...props}
    >
      <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="opacity-20" />
      <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="1" className="opacity-15" />
      <circle cx="100" cy="100" r="20" fill="currentColor" className="opacity-10" />
    </svg>
  );
}
