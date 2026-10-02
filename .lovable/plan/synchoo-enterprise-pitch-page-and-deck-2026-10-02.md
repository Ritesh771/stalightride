# Synchoo enterprise pitch page and deck

## Outcome
Create a public, executive-level Synchoo pitch experience and a downloadable PDF deck. Both will use the repository, implemented workflows, schema, tests, and existing product UI as their source of truth. Unsupported traction, revenue, market-size, customer, and operational claims will not be included.

## Build
1. **Verified content model**
   - Consolidate approved pitch copy into one shared source used by the page and deck.
   - Separate current capabilities from clearly labeled proposed roadmap items.
   - Correct or omit any current marketing copy that cannot be substantiated by the codebase.

2. **Public pitch page at `/pitch`**
   - Create a polished long-form narrative for senior clients, partners, and investors.
   - Cover: mobility problem, Synchoo solution, product ecosystem, user roles, end-to-end workflows, trust and verification, payments, architecture, scalability, security/privacy, delivery readiness, business value, roadmap, and call to action.
   - Use the existing premium dark automotive system, responsive full-width sections, strong typography, restrained motion, and semantic design tokens.
   - Add accurate visual diagrams for the platform ecosystem, booking lifecycle, architecture, and trust controls.
   - Include project-derived UI imagery rather than stock imagery or invented customer visuals.

3. **Downloadable pitch deck**
   - Produce a concise, presentation-ready PDF deck using the same verified narrative.
   - Use a 16:9 executive presentation format with varied visual layouts, product screenshots, architecture/workflow diagrams, and clearly labeled current-versus-proposed content.
   - Save a user-downloadable copy and serve the same deck from the app through the project asset flow.

4. **Navigation and metadata**
   - Add a clear “Pitch & proposal” link in a properly structured Company area of the global footer.
   - Add a prominent deck-download action on the pitch page.
   - Add unique title, description, Open Graph fields, Twitter card, canonical URL, and structured data for the new public route.

5. **Documentation and decisions**
   - Record the shared pitch-content architecture in `AGENTS.md` so future changes keep the page and deck aligned.
   - Preserve all existing product functionality and routes.

## Verification
- Check desktop, tablet, and mobile layouts for overflow, overlap, legibility, and navigation.
- Exercise the public pitch route and deck download end to end.
- Render every PDF page to images, inspect all pages, fix defects, and re-render for a clean final pass.
- Run the relevant automated tests and confirm the latest app build is healthy.
