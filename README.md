# Genvex Flow Card

Responsive animated Home Assistant Lovelace card for visualising a heat-recovery ventilation system.

## Project status

The project is under active development. Stable code lives on `main`; current work lives on `dev`.

### Branches

- `main` — stable/release-ready builds used for normal HACS installation.
- `dev` — development builds and visual iteration.

Development versions use a suffix such as `0.3.1-dev.1`. Stable releases use semantic versions such as `0.3.1`.

## HACS

Add this repository to HACS as a custom **Dashboard** repository.

The distributed resource is:

`genvex-flow-card.js`

Basic card configuration:

```yaml
type: custom:genvex-flow-card
title: Ventilation
height: 720
```

The `height` option controls the card's rendered height. The SVG uses a fixed viewBox with `preserveAspectRatio="xMidYMid meet"` so the complete scene remains visible while scaling.

## Development workflow

1. Development is committed to `dev`.
2. Test development builds in Home Assistant.
3. Promote tested code to `main`.
4. Tag stable versions as `vX.Y.Z`.
5. GitHub Actions validates JavaScript and required HACS files. Tagged versions produce a GitHub release artifact.

## Design goals

- A visual explanation of the ventilation system rather than an entity list.
- Four physically correct animated airflow paths.
- Temperature-driven flow colours.
- Fan level represented by both rotation speed and a numeric level.
- Responsive SVG scene suitable for a normal card or a full-dashboard layout.
- Visual status for heat recovery, humidity, filter and operating modes.
- No direct communication with the ventilation unit; Home Assistant entities are the data source.

## License

MIT
