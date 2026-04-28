---
description: Scaffold a 3D scene with R3F + drei, dynamically imported for SSR safety
argument-hint: <SceneName> [purpose]
---

The user wants a 3D scene: `$ARGUMENTS`.

If `three`, `@react-three/fiber`, `@react-three/drei` are not installed, surface the install command first:

```bash
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```

Create:

1. **`components/three/<SceneName>.tsx`** — Client Component:

   ```typescript
   'use client';

   import { Canvas } from '@react-three/fiber';
   import { OrbitControls, Environment } from '@react-three/drei';
   import { Suspense } from 'react';

   export function SceneName() {
     return (
       <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 50 }}>
         <Suspense fallback={null}>
           <ambientLight intensity={0.4} />
           <directionalLight position={[5, 5, 5]} intensity={1} />
           {/* mesh / model goes here */}
           <Environment preset="studio" />
           <OrbitControls />
         </Suspense>
       </Canvas>
     );
   }
   ```

2. **`components/three/<SceneName>Loader.tsx`** — dynamic import wrapper to keep the heavy bundle out of SSR:

   ```typescript
   import dynamic from 'next/dynamic';

   export const SceneNameLoader = dynamic(
     () => import('./SceneName').then((m) => m.SceneName),
     { ssr: false, loading: () => <div className="h-full w-full" /> }
   );
   ```

3. Use `<SceneNameLoader />` from any Server or Client Component. The loader is itself a Client Component but its `{ ssr: false }` flag keeps the R3F bundle off the server.

Constraints:

- The `<Canvas>` and everything inside it MUST live in a Client Component. R3F has no Server Component support.
- Always wrap the dynamic import with `{ ssr: false }`. Importing R3F server-side breaks the build.
- Code-split heavy GLTF assets via `useGLTF.preload(url)` only after the first paint.
- Strip `<Stats />` and any `leva` controls from production builds (env-gated mounting).
- Three.js is ~600KB gzipped — never import it unconditionally into a route that might be opened without 3D.
