# AlgoEstate - Complete Codebase Documentation

This document contains the complete codebase of the AlgoEstate project, including all source files, configurations, and documentation.

## Table of Contents
1. [Configuration Files](#configuration-files)
2. [HTML Entry Point](#html-entry-point)
3. [Source Files](#source-files)
4. [Components](#components)
5. [Services](#services)
6. [Types](#types)
7. [Hooks](#hooks)
8. [Contexts](#contexts)
9. [Pages](#pages)
10. [Database Migrations](#database-migrations)

---

## Configuration Files

### package.json
```json
{
  "name": "algorand-real-estate-marketplace",
  "description": "A tokenized real estate marketplace built on Algorand with React, Vite, TypeScript, and wallet connectivity",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "license": "MIT",
  "author": "Algorand Foundation",
  "scripts": {
    "dev": "vite",
    "lint": "eslint .",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@algorandfoundation/algokit-utils": "^9.1.0",
    "@algorandfoundation/algokit-subscriber": "^3.2.0",
    "@blockshake/defly-connect": "^1.2.1",
    "@perawallet/connect": "^1.4.2",
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/react-query": "^5.51.11",
    "@txnlab/use-wallet-react": "^4.0.1",
    "@txnlab/use-wallet-ui-react": "^0.2.3",
    "@walletconnect/modal": "^2.7.0",
    "@walletconnect/sign-client": "^2.20.2",
    "algosdk": "^3.3.0",
    "lucide-react": "^0.508.0",
    "lute-connect": "^1.6.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-dropzone": "^14.2.3",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.12.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.4.1",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.26.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "eslint-plugin-tailwindcss": "^3.18.0",
    "globals": "^16.0.0",
    "postcss": "^8.5.3",
    "prettier": "^3.5.3",
    "prettier-plugin-tailwindcss": "^0.6.11",
    "tailwindcss": "^3",
    "typescript": "^5.8.3",
    "typescript-eslint": "^8.30.1",
    "vite": "^6.3.4",
    "vite-plugin-node-polyfills": "^0.23.0"
  }
}
```

### tsconfig.json
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

### vite.config.ts
```typescript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
  ],
})
```

---

## HTML Entry Point

### index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/algorand.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Algorand React Starter</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---