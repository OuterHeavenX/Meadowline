# Meadowline Visual Cohesion 3.1.1

Status: **Current development** on `feature/visual-cohesion-3-1-1`, based on exact validated Living City 3.1 candidate `455acd193e1b90d0ab3cae81ee5cbd3e66c41b61`. It is not Production and has not received physical-device acceptance.

## Product target

This pass turns the initial Three.js proof into one coherent low-poly miniature-city language. It changes presentation only: Save V3, the 44×44 world, placement, costs, Housing tiers, Roads/Rail, trains, services, economy and safe touch remain authoritative elsewhere.

## Modular procedural art kit

`src/rendering/three-world-art.js` owns reusable presentation primitives, material families and registry-driven archetypes. `src/rendering/three-renderer.js` remains the renderer lifecycle/camera/dynamic-actor orchestrator.

- Cottage: low single-storey mass, gable, porch, chimney, garden.
- Town Home: stronger two-storey mass, side volume, cross-gable and landscaping.
- Established Home: broad articulated mass, wing, richer roof, porch, fence and hedge.
- Café, Market, Bakery and Station share storefront grammar but have distinct awning/detail cues.
- School, City Hall, Police, Fire, Clinic and Hospital use category-specific silhouettes, entrances and service aprons.
- Housing variation derives deterministically from the saved building seed and a cheap spatial district hash. No mesh selection is saved.
- Multi-tile Recreation and municipal facilities use their existing registry footprint as visual composition space.

Shared procedural geometry is the current production choice. The permanent authored-asset path is documented in `assets/ASSETS.md`: Blender → optimized GLB → cached Three.js, with one tile = one unit, Y-up, +Z frontage, footprint-centered origins and explicit triangle/license budgets. No third-party model or texture ships in this pass.

## Roads and Rail

Road visuals derive a four-bit north/east/south/west mask from the existing semantic Road graph. The art layer classifies isolated, dead-end, straight, corner, T and four-way forms without creating new Road types.

- asphalt joins across complete tiles;
- curbs/sidewalks occupy exposed edges;
- straight guidance is restrained and centered;
- T/four-way forms receive short crosswalk bars;
- dead ends receive a clear cap;
- bridge decks receive lift, rails and a visible base;
- Road/Rail crossings read generic crossing state and preserve dual-network truth;
- Rail keeps ties and paired steel rails.

The current renderer still rebuilds its static world group when the authoritative visual signature changes. It does not yet perform neighbor-chunk-only GPU remeshing; the 44×44 rebuild remains bounded and is recorded as remaining debt rather than misrepresented as complete.

## Terrain, parcels and water

- Ground colors vary in broad deterministic five-tile regions with sparse accents rather than per-tile checker noise.
- Open land uses Meadowline greens; locked parcels use muted green families rather than missing white geometry.
- Logical ownership remains solely in City Growth.
- A dark extruded base gives the 44×44 world an intentional diorama edge.
- Player-created and natural water use distinct shallow/deep adjacency bands.
- Every exposed water edge receives a narrow bank; deterministic reeds appear sparingly.
- Water visuals never change terrain authority or safe placement.

The build grid is now carried primarily by restrained terrain variation and authoritative placement feedback. A future interaction-led pass may add a dedicated GPU footprint/grid overlay once it can share the existing hover state without creating a second input system.

## Composition

Natural trees are presentation-thinned deterministically, reduced beside development, capped at 230 near and 110 far, and rendered from one coherent broadleaf/conifer family. Saved natural-tree and player-tree state is never deleted. Housing roof tendencies share a cheap district hash, creating neighborhood rhythm without a style simulation.

The camera remains the proven isometric mapping. Static detail changes only at a coarse near/far zoom band, preventing per-frame churn and reducing far tree density.

## Performance and lifecycle

- Terrain is instanced by material/depth class.
- Geometry/material caches are shared across archetypes.
- Module-owned cached geometry is marked so world-group replacement cannot dispose an object that will be reused.
- Generated one-off geometry remains disposable.
- Diagnostics expose draw calls, triangles, geometries, textures, art materials and visible trees.
- The dedicated cohesion regression covers all Road masks, tier identities, deterministic descriptors, registry archetype coverage, renderer initialization, draw-call bounds and tree caps.

The first local Headless Chrome/SwiftShader cohesion fixture produced 435 draw calls, below the 1,100 regression ceiling. This is automatic evidence only; it is not physical iPhone/iPad frame, memory or thermal proof.

## Save and fallback

Save key remains `meadowline.v3`. The art system serializes nothing. Classic Canvas remains the complete compatibility renderer and postcard source. Context failure never mutates authoritative state.

## Known limits

- GPU selection/placement overlays still need a dedicated visual-state bridge; input authority must not move into Three.js.
- Static-world rebuild is bounded but not chunk-local.
- Procedural civic/commerce assets are now distinct, but authored GLB landmark detail remains a future option after device budgets are measured.
- Water banks are adjacency-derived but remain tile-based rather than spline shorelines.
- Physical iPhone/iPad clarity, input alignment, performance, memory and thermals remain unchecked.
