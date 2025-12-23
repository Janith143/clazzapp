/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'primary': {
                    light: '#60a5fa', // blue-400
                    DEFAULT: '#3b82f6', // blue-500
                    dark: '#2563eb', // blue-600
                },
                'light-background': '#f8fafc', // slate-50
                'light-surface': '#ffffff', // white
                'light-text': '#0f172a', // slate-900
                'light-subtle': '#64748b', // slate-500
                'light-border': '#e2e8f0', // slate-200
                'dark-background': '#020617', // slate-950
                'dark-surface': '#0f172a', // slate-900
                'dark-text': '#e2e8f0', // slate-200
                'dark-subtle': '#94a3b8', // slate-400
                'dark-border': '#1e293b', // slate-800
            },
            animation: {
                fadeIn: 'fadeIn 0.5s ease-in-out',
                slideInUp: 'slideInUp 0.5s ease-in-out',
                marquee: 'marquee 40s linear infinite',
                shake: 'shake 0.6s cubic-bezier(.36,.07,.19,.97) both',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                shake: {
                    '10%, 90%': { transform: 'translateX(-1px)' },
                    '20%, 80%': { transform: 'translateX(2px)' },
                    '30%, 50%, 70%': { transform: 'translateX(-4px)' },
                    '40%, 60%': { transform: 'translateX(4px)' },
                }
            }
        }
    },
    plugins: [],
}
