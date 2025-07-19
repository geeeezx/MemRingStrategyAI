/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background colors
        background: {
          DEFAULT: '#1a1a1a', // Dark mode
          light: '#f8f9fa',    // Light mode
        },
        paper: {
          DEFAULT: '#2d2d2d',  // Dark mode
          light: '#ffffff',    // Light mode
        },
        primary: {
          DEFAULT: '#90caf9',  // Blue for dark mode
          light: '#1976d2',    // Darker blue for light mode
        },
        // Text colors
        text: {
          primary: {
            DEFAULT: '#ffffff',  // Dark mode
            light: '#1a1a1a',   // Light mode
          },
          secondary: {
            DEFAULT: '#b3b3b3',  // Dark mode
            light: '#666666',   // Light mode
          },
          muted: {
            DEFAULT: '#666666',  // Dark mode
            light: '#999999',   // Light mode
          }
        },
        // Border colors
        border: {
          DEFAULT: '#404040',  // Dark mode
          light: '#e0e0e0',   // Light mode
        },
        // Card backgrounds
        card: {
          DEFAULT: '#1a1a1a',  // Dark mode
          light: '#ffffff',    // Light mode
        },
        // Input backgrounds
        input: {
          DEFAULT: '#1a1a1a',  // Dark mode
          light: '#f5f5f5',   // Light mode
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      typography: (theme) => ({
        invert: {
          css: {
            '--tw-prose-body': theme('colors.gray[300]'),
            '--tw-prose-headings': theme('colors.white'),
            '--tw-prose-links': theme('colors.primary.DEFAULT'),
            '--tw-prose-bold': theme('colors.white'),
            '--tw-prose-quotes': theme('colors.gray[300]'),
            '--tw-prose-code': theme('colors.white'),
            '--tw-prose-hr': theme('colors.gray[700]'),
            '--tw-prose-th-borders': theme('colors.gray[700]'),
          },
        },
        light: {
          css: {
            '--tw-prose-body': theme('colors.gray[700]'),
            '--tw-prose-headings': theme('colors.gray[900]'),
            '--tw-prose-links': theme('colors.primary.light'),
            '--tw-prose-bold': theme('colors.gray[900]'),
            '--tw-prose-quotes': theme('colors.gray[700]'),
            '--tw-prose-code': theme('colors.gray[900]'),
            '--tw-prose-hr': theme('colors.gray[300]'),
            '--tw-prose-th-borders': theme('colors.gray[300]'),
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 