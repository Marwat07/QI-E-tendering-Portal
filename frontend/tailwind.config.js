/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Layout classes
    'min-h-screen',
    'bg-gray-100',
    'w-64',
    'bg-white',
    'shadow-lg',
    'flex',
    'flex-1',
    'items-center',
    'justify-center',
    'w-full',
    
    // Spacing classes
    'p-2', 'p-3', 'p-4', 'p-6', 'p-8',
    'px-2', 'px-3', 'px-4', 'px-6',
    'py-1', 'py-2', 'py-3', 'py-4',
    'mt-1', 'mt-2', 'mt-4', 'mt-6',
    'mb-2', 'mb-4', 'mb-6', 'mb-8',
    'mr-1', 'mr-2', 'mr-3', 'mr-4',
    'ml-3',
    
    // Typography classes
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl',
    'font-medium', 'font-semibold', 'font-bold',
    'text-left', 'text-center',
    'uppercase', 'tracking-wider',
    
    // Color classes - Text
    'text-white',
    'text-gray-400', 'text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-800', 'text-gray-900',
    'text-blue-500', 'text-blue-600', 'text-blue-900',
    'text-green-600', 'text-green-800', 'text-green-900',
    'text-yellow-600', 'text-yellow-800',
    'text-orange-600', 'text-orange-800',
    'text-red-600', 'text-red-800', 'text-red-900',
    'text-purple-600',
    
    // Color classes - Backgrounds
    'bg-white',
    'bg-gray-50', 'bg-gray-100', 'bg-gray-200',
    'bg-blue-50', 'bg-blue-100', 'bg-blue-600', 'bg-blue-700',
    'bg-green-50', 'bg-green-100', 'bg-green-500',
    'bg-yellow-100', 'bg-yellow-500',
    'bg-orange-100',
    'bg-red-100',
    'bg-purple-50',
    
    // Border classes
    'border', 'border-2', 'border-b', 'border-r-2',
    'border-gray-200', 'border-gray-300',
    'border-blue-300', 'border-blue-500',
    'border-green-300',
    'border-purple-300',
    'border-dashed',
    
    // Size classes
    'w-2', 'w-4', 'w-5', 'w-6', 'w-12',
    'h-2', 'h-4', 'h-5', 'h-6', 'h-12', 'h-64',
    
    // Grid classes
    'grid',
    'grid-cols-1',
    'md:grid-cols-2',
    'lg:grid-cols-2', 'lg:grid-cols-4',
    'gap-2', 'gap-4', 'gap-6',
    'space-x-2', 'space-y-2', 'space-y-3',
    
    // Interactive classes
    'cursor-pointer',
    'hover:bg-gray-50', 'hover:bg-gray-200',
    'hover:bg-blue-50', 'hover:bg-blue-700',
    'hover:bg-green-50',
    'hover:bg-purple-50',
    'hover:text-blue-500', 'hover:text-blue-900',
    'hover:text-green-900',
    'hover:text-red-800', 'hover:text-red-900',
    'hover:border-blue-300', 'hover:border-green-300', 'hover:border-purple-300',
    'transition-colors',
    
    // Form classes
    'focus:ring-2', 'focus:ring-blue-500', 'focus:border-transparent',
    
    // Visual effects
    'rounded', 'rounded-lg', 'rounded-full',
    'shadow', 'shadow-lg',
    'divide-y', 'divide-gray-200',
    'overflow-hidden',
    
    // Animation classes
    'animate-spin',
    
    // Table classes
    'min-w-full', 'whitespace-nowrap',
    
    // State classes
    'disabled:opacity-50', 'disabled:cursor-not-allowed',
    'hidden'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
