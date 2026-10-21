# NightOwl Design Summary

## 1. Product intent

NightOwl is a dark-mode civic transport operations prototype for safer night travel in Karnataka. It connects three operational concerns in one experience:

- Forecast where night-time ride demand will occur.
- Dispatch available vehicles only when the associated driver meets the safety threshold.
- Give riders clear booking, route, fare, driver, and emergency-support information.

The current implementation is a front-end demo with seeded data and in-memory state. It is designed to demonstrate the operating model and user experience rather than provide production authentication, persistence, or live dispatch connectivity.

## 2. Technology and application structure

- React 19 with TypeScript.
- Vite for development and production bundling.
- React Router for route-level navigation and access guards.
- Zustand for shared application state.
- Tailwind CSS plus global CSS tokens for styling.
- Recharts for KPI and trend visualizations.
- Leaflet and React Leaflet for the government demand map.
- Lucide React for interface icons.
- Framer Motion is available for motion design.

The application starts at [src/main.tsx](./src/main.tsx) and is composed by [src/App.tsx](./src/App.tsx). Reusable UI is grouped under [src/components/](./src/components/), route-level views under [src/pages/](./src/pages/), domain logic under [src/lib/](./src/lib/), seeded records under [src/data/mockData.ts](./src/data/mockData.ts), and shared domain types under [src/types/models.ts](./src/types/models.ts).

## 3. Navigation and access model

The root layout is [AppShell](./src/components/shared/AppShell.tsx), which provides the NightOwl brand, role-aware navigation, current-role context, logout, and the routed content area.

The supported demo roles are:

| Role | Primary responsibility | Available areas |
| --- | --- | --- |
| Super admin | Full platform oversight | Dashboard, demand map, dispatch, fleet, riders, reports, settings |
| Government admin | Public coverage and demand planning | Dashboard, demand map |
| Company admin | Employee transport coverage and reporting | Dashboard, reports |
| Fleet operator | Vehicle readiness and dispatch execution | Dashboard, dispatch |
| Driver | Operational dispatch and rider context | Dispatch, riders |
| Rider | Safe ride booking and trip visibility | Dashboard, dispatch, riders, settings |

Route protection is handled in [src/App.tsx](./src/App.tsx). Unauthenticated users are redirected to `/login`; users without access to a page are redirected to `/dashboard`. The login screen currently supports demo-role entry rather than real credential validation.

## 4. Core user journeys

### Rider journey

The rider dashboard uses [RiderPassengerFlow](./src/components/rider/RiderPassengerFlow.tsx) as a guided booking flow:

1. Select pickup and destination.
2. Choose an immediate or scheduled trip.
3. Review route duration, distance, safer-corridor guidance, and ride options.
4. Compare safety confidence, ETA, vehicle type, capacity, and fare.
5. Select a payment method and confirm the trip.
6. Track driver arrival and trip state.
7. Use trusted contacts, safety advisories, and the floating SOS action when needed.

The flow includes Bengaluru location suggestions, optional browser geolocation, reverse geocoding, route previews, and a safety-oriented presentation. If Google Places is not configured, the experience can still use the built-in Bengaluru location set.

### Fleet operator journey

The fleet dashboard and dispatch page focus on quick operational scanning:

- Review pending requests, active trips, delays, blockers, vehicle availability, and utilization.
- Inspect an individual dispatch with vehicle, driver, ETA, and progress.
- Assign a vehicle and receive a confirmation state.

Dispatch recommendations are sorted by ETA and filtered by vehicle readiness, availability, driver status, and minimum safety score.

### Government journey

The government dashboard provides a coverage overview across Karnataka zones. The demand map:

- Filters zones by a demand threshold.
- Displays demand, vehicle requirement, available vehicles, coverage gaps, and confidence.
- Shows an interactive Leaflet map with demand-scaled markers.
- Highlights high-need zones for targeted intervention.
- Supports recalculating a selected zone from configurable demand assumptions.

### Company journey

The company dashboard focuses on employee transport coverage and fleet alignment. It includes KPI cards, trend visualizations, pending employee allocations, confirmation flows, notifications, and operational feedback states.

### Shared operational views

The dashboard, riders, fleet, reports, and settings pages reuse the same underlying store and domain records. This keeps role-specific presentation separate from the shared model of geographies, demand, drivers, vehicles, riders, dispatches, and safety settings.

## 5. Domain model and state

The central Zustand store is [useNightOwlStore](./src/store/useNightOwlStore.ts). It initializes the application with mock geographies, demand records, drivers, vehicles, riders, and seed dispatches.

Important state behaviors include:

- `role`: current demo role or `null`.
- `demandSettings`: night-shift ratio, transport-need ratio, urban weighting, and average vehicle capacity.
- `safetyWeights`: configurable contribution of identity, licence, background, GPS, panic readiness, training, and rating/history checks.
- `selectedPickupLocality`: connects rider location selection to nearby driver and coverage views.
- Dispatch actions for recommendation, creation, rider assignment, and status updates.
- Recalculation of driver safety scores whenever safety weights change.

The shared types in [src/types/models.ts](./src/types/models.ts) define the vocabulary used across these screens, including `DemandRecord`, `Driver`, `Vehicle`, `Dispatch`, `Rider`, `Role`, and `SafetyWeights`.

## 6. Business rules

### Demand planning

Demand calculations are centralized in [src/lib/calculations.ts](./src/lib/calculations.ts):

```text
estimated night workers = female workers x night-shift ratio
estimated ride demand = female workers x night-shift ratio
                       x transport-need ratio x urban weight
vehicles needed = ceiling(estimated ride demand / vehicle capacity)
```

The implementation also derives a confidence band from the distance of the configurable ratios from the seeded baseline assumptions. Coverage gaps and a weighted priority score are available for operational ranking.

### Driver safety

[src/lib/safety.ts](./src/lib/safety.ts) calculates a score from verification, readiness, training, rating, and incident history. The score is classified as trusted, safe, review, or do-not-dispatch. A driver must score at least 60 to be eligible for dispatch.

The default weights total 100 points:

- Aadhaar verification: 15
- Licence verification: 15
- Background clearance: 20
- GPS active: 10
- Panic-ready: 10
- Training complete: 10
- Rating and history: 20

### Dispatch

The store recommends ready and available vehicles in the selected zone, excludes offline or unsafe drivers, and sorts the remaining vehicles by ETA. Creating dispatches marks selected vehicles unavailable, marks their drivers assigned, creates assigned dispatch records, and associates new dispatches with unassigned riders.

### Fare calculation

[src/lib/indianMeterFare.ts](./src/lib/indianMeterFare.ts) models an Indian meter-style fare using:

- Base fare and included distance.
- Fuel cost derived from petrol price and mileage.
- Driver and operations cost per kilometre.
- A safety fee.
- A night surcharge.

Inputs are clamped to safe minimums and the displayed fare is rounded up to the next rupee.

## 7. Visual and interaction design

The visual direction is a calm, high-contrast night operations console:

- Deep navy/slate surfaces for reduced glare.
- Amber as the primary action and attention color.
- Violet as the secondary brand accent.
- Emerald for safe/success states.
- Amber for warnings and red/rose for danger states.
- Space Grotesk for headings and Manrope for body text.
- Rounded cards, subtle borders, soft shadows, and compact KPI layouts.

The style tokens and base typography live in [src/index.css](./src/index.css), while the shared gradient and shadow utilities are configured in [tailwind.config.js](./tailwind.config.js). The interface favors scan-friendly cards, status chips, progress indicators, confirmation modals, sheets, toast notifications, and responsive grid layouts.

Safety-critical actions are intentionally explicit. Assignment, deployment, incident, alert, SOS, and notification interactions provide confirmation or visible feedback rather than silently changing state.

## 8. External integrations

[src/lib/googlePlaces.ts](./src/lib/googlePlaces.ts) provides optional Google integrations:

- Places Autocomplete suggestions through the Places API.
- Reverse geocoding through the Google Maps Geocoding API.
- India-region filtering and a Bengaluru-centered location bias.
- Session tokens for autocomplete requests.

The integration is feature-detected through `VITE_GOOGLE_MAPS_API_KEY`. When no key is available, the rider flow falls back to seeded locations and local route summaries.

The government map uses Leaflet tiles from CARTO and district coordinates maintained in [src/pages/DemandMap.tsx](./src/pages/DemandMap.tsx).

## 9. Current implementation boundaries

This snapshot is intentionally a demo/prototype:

- Login is demo-role selection; email and password fields are not connected to an authentication service.
- State is held in memory and resets on refresh.
- Mock data stands in for backend, database, identity verification, GPS, payments, notifications, and dispatch providers.
- Route summaries use seeded corridor data and deterministic fallback estimates rather than live routing.
- The government map uses a static district coordinate list and map tiles.
- Google API failures currently produce empty or unavailable suggestions rather than a surfaced backend error state.
- Reports and settings demonstrate the intended operator experience but are not connected to persistence or export services.

The next production-design steps would be to introduce authenticated sessions and a backend API, persist operational records, connect live vehicle telemetry and routing, add audit history for safety and dispatch changes, and replace mock notifications/payments with provider integrations.

## 10. How to run

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

For a production validation build:

```bash
npm run build
```

Set `VITE_GOOGLE_MAPS_API_KEY` in the local environment when testing Google Places autocomplete and reverse geocoding.
