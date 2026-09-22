# 0004: Visual system, frozen; optional polish noted

**Status:** the visual system is frozen as of 8ff35ba (after the core-product
consistency audit). These are recorded, not scheduled. Revisit only when a route is
reopened for another reason (Checkpoint E will reopen the save/status control).

1. Primary action heights differ: Home and Library CTAs 48px, Book Detail save control
   52px, Auth 50px, Discover search 56px. A shared 48/52 rule could be set when
   Checkpoint E reworks the save control.
2. Cover hover lift differs: Discover 5px, Home 4px, Library 3px.
3. Three cover components with near-identical shadows: Discover's TileCover, Home's
   HomeCover, and the shared CoverObject (Book Detail, Library). Merge if a frozen route
   is reopened.
4. Small labels at 10, 11 and 12px.
5. Book Detail's save/status control still uses the older Button component.
