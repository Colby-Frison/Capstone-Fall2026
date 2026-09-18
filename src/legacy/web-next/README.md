# Pilots Guide to Medical Certification — web

Next.js (App Router) + TypeScript frontend for the capstone project. Currently just an
index page; search, disposition labels, and content pages land in later tickets.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it. Edit `app/page.tsx` to
change the index page.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Run Jest + React Testing Library tests |
| `npm run test:watch` | Run tests in watch mode |

## Testing

Component tests live next to the code they cover (e.g. `app/page.test.tsx`) and run with
Jest and React Testing Library, configured via `next/jest` in `jest.config.ts`.
