/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,css}'],
  theme: {
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
      '5xl': '48px',
      '6xl': '60px',
    },
    extend: {
      fontFamily: {
        sans: ['Paperlogy', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        normal: '400',
        semibold: '600',
      },
      backgroundImage: {
        login: "url('/images/background/background_login.png')",
        main: "url('/images/background/background_main.png')",
        mypage: "url('/images/background/background_mypage.png')",
        join: "url('/images/background/background_join.png')",
        logo: "url('/images/logo/logo.png')",
      },
    },
  },
  plugins: [],
};
