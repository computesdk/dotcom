# Agent Guidelines for ComputeSDK Landing Page

## Build Commands
- `npm run dev` - Start development server with Astro
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- No test framework configured - verify changes manually

## Project Structure
- Astro + React hybrid app using Starlight for docs
- TypeScript with strict config extending astro/tsconfigs/strict
- Tailwind CSS v4 with custom styling
- Components in `/src/components/` split between Catalyst UI library and playground

## Code Style
- Import order: External packages first, then relative imports with `./` prefix
- Use `clsx` for conditional class names, never template literals for classes
- TypeScript: Strict types, use union types for component variants (e.g., `color | outline | plain`)
- React: Use `forwardRef` for reusable components, prefer function components
- File naming: PascalCase for components (`.tsx`), camelCase for hooks (`.ts`)
- CSS: Use Tailwind utilities, CSS variables for theming with `--` prefix
- No comments in code unless explicitly requested

## Error Handling
- Use TypeScript for type safety, no runtime error boundaries configured
- Validate props with union types and conditional props patterns
- Handle client-side only code with `typeof window !== 'undefined'` checks