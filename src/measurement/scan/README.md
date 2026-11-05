# Browser scanner

Public entry: `src/measurement/scan.ts`. `scanAll` returns a `ScanMap` of typed entries and accepts a progress callback. Importing it does not run a scan.

- `walker.ts`: global/prototype traversal and value formatting.
- `core.ts`, `media.ts`, `advanced.ts`: ordered probe activators.
- `css-probe.ts`, `css-effects.ts`: CSS and rendered-effect measurements.
- `canvas2d.ts`, `gpu-probes.ts`, `integrity.ts`: specialized probes.
- `constants-*.ts`: static workload tables grouped by domain.
- `types.ts`: scanner contracts and structural types for experimental browser APIs.

There is no React dependency or application-state access in this layer. Temporary DOM elements are measurement fixtures, not UI components. Activator timeouts do not cancel the underlying browser operation. Live timings, hashes, fonts, and API availability depend on the browser environment.

Run `npm run check` for static checks. The previous scanner test harness and fixtures have been removed.
