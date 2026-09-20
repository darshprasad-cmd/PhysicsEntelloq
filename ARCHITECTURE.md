# Physics Entelloq architecture

## System overview
Physics Entelloq is a static, single-file learning application. The repository has no package manager, application server, or compilation pipeline.

```text
GitHub Pages / local HTTP server
  `-- index.html
       |-- document structure and navigation
       |-- shared visual system
       |-- application state and persistence
       |-- simulations and experiment benches
       `-- learning/research interfaces
```

## Repository layout
- `index.html`: the full application source and deployable artifact.
- `assets/`: icons, mark, social image, and installable-site artwork.
- `CNAME`: custom-domain configuration.
- `robots.txt` and `sitemap.xml`: crawler and public URL metadata.
- `README.md`: product overview.
- `.gitignore`: excludes the local deployment helper.

## Runtime boundaries
All UI, state, simulation, and content behavior lives in the browser. Changes can therefore affect seemingly distant features through:

- global CSS selectors and custom properties;
- shared DOM IDs/classes;
- global JavaScript variables and functions;
- common input, animation, and navigation handlers;
- local-storage keys and serialized state;
- canvas/WebGL resources and animation loops.

Search the entire file for a symbol or selector before changing it.

## Simulation guidance
Physics behavior should have an identifiable input -> model -> integration/update -> render flow. Preserve:

- explicit unit conventions;
- stable time-step behavior;
- boundary and singularity handling;
- separation between model state and rendered coordinates where the existing implementation provides it;
- cleanup of animation frames, media streams, listeners, and GPU resources when leaving an experience.

Any deliberate approximation should be explained close to the relevant code.

## Deployment
The repository root is the published site. There is no generated `dist/` directory. A push to the publishing branch updates the static artifact according to the repository's GitHub Pages configuration. Preserve `CNAME` when changing deployment-related files.

## Main risks
- A syntax error can prevent the entire application from initializing.
- Broad CSS changes can regress unrelated experiences.
- Long-running animation loops or repeated listeners can degrade all sections.
- Renaming IDs, routes, or storage keys can break navigation and saved user state.
- Scientific-looking output can be misleading if units or approximations are implicit.
