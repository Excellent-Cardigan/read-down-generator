
import React from 'react';

export default function Layout({ children, currentPageName }) {
  return (
    <div>
      <style>{`
        :root {
          /* Brand Color System - Light Mode - Beige Neutrals */
          --background: 40 33% 98%;      /* #faf9f7 - neutral-10 */
          --foreground: 28 11% 25%;      /* Darker version of neutral-60 */
          --card: 0 0% 100%;
          --card-foreground: 28 11% 25%;
          --popover: 0 0% 100%;
          --popover-foreground: 28 11% 25%;
          --primary: 24 100% 49%;        /* #fa6400 - orange-70 */
          --primary-foreground: 0 0% 100%;
          --secondary: 187 91% 32%;      /* #098e9b - teal-70 */
          --secondary-foreground: 0 0% 100%;
          --muted: 30 22% 89%;           /* #e9dfd6 - neutral-30 */
          --muted-foreground: 28 11% 42%; /* #756a60 - neutral-60 */
          --accent: 14 94% 50%;          /* #f24911 - tangerine-70 */
          --accent-foreground: 0 0% 100%;
          --destructive: 358 73% 49%;    /* #cf212a - red-60 */
          --destructive-foreground: 0 0% 100%;
          --border: 30 11% 84%;          /* #d5cfc6 - neutral-40 */
          --input: 30 11% 84%;
          --ring: 24 100% 49%;           /* #fa6400 - orange-70 */
          --radius: 0.5rem;
        }

        .dark {
          /* Brand Color System - Dark Mode - Beige Neutrals */
          --background: 28 11% 15%;      /* Dark brown based on neutral-60 */
          --foreground: 30 11% 84%;      /* #d5cfc6 - neutral-40 */
          --card: 28 11% 20%;
          --card-foreground: 30 11% 84%;
          --popover: 28 11% 20%;
          --popover-foreground: 30 11% 84%;
          --primary: 24 100% 49%;        /* #fa6400 - orange-70 */
          --primary-foreground: 0 0% 100%;
          --secondary: 184 65% 65%;      /* #7ccfd4 - teal-30 */
          --secondary-foreground: 28 11% 15%;
          --muted: 28 11% 25%;
          --muted-foreground: 32 6% 53%;  /* #8b8680 - neutral-50 */
          --accent: 19 100% 83%;          /* #ffc4b0 - tangerine-30 */
          --accent-foreground: 28 11% 15%;
          --destructive: 356 75% 64%;    /* #e85d64 - red-50 */
          --destructive-foreground: 0 0% 100%;
          --border: 28 11% 30%;
          --input: 28 11% 30%;
          --ring: 24 100% 49%;
        }

        * {
          border-color: hsl(var(--border));
        }
        
        body {
          background-color: hsl(var(--background));
          color: hsl(var(--foreground));
        }
      `}</style>
      {children}
    </div>
  );
}
