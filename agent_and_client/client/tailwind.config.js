/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#2F855A', // Green 700 - Agri theme
                secondary: '#ECC94B', // Yellow 400
                dark: '#1A202C',
            }
        },
    },
    plugins: [],
}
