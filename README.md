# Bloch Sphere Simulator

An interactive, educational simulator of a single qubit on the Bloch sphere, plus an MCP server that lets an AI agent drive it in real time: apply gates, measure, write captions on the sphere and prepare step-by-step sequences for the learner.

The UI is in Spanish; code and identifiers are in English.

![Bloch sphere simulator](docs/screenshot.png)

## Quick start

Requires Node.js 22+ and [pnpm](https://pnpm.io) 10.

```bash
pnpm install
pnpm dev
```

Open http://localhost:5180. The port is fixed (`strictPort`): if it is taken, Vite fails instead of silently moving to another port.

## Letting an agent drive the sphere

The MCP server is started by the agent over stdio and opens a WebSocket bridge that every open tab of the app connects to.

```
agent ──stdio (JSON-RPC)──▶ MCP server ──WebSocket 127.0.0.1:7331──▶ tab-1, tab-2, …
```

Register it with the absolute paths of your checkout. For Claude Code:

```bash
claude mcp add bloch-sphere -- /path/to/Esfera/node_modules/.bin/tsx /path/to/Esfera/server/index.ts
```

For any other MCP client:

```json
{
  "mcpServers": {
    "bloch-sphere": {
      "command": "/path/to/Esfera/node_modules/.bin/tsx",
      "args": ["/path/to/Esfera/server/index.ts"]
    }
  }
}
```

Do not use `pnpm mcp` or `pnpm exec` as the agent command: pnpm and some shell wrappers print banners to stdout, which corrupts the JSON-RPC stream. `pnpm mcp` is fine for running the server by hand.

Keep `pnpm dev` running and the page open. The badge in the top right corner of the sphere shows `Agente conectado · tab-N` once the bridge is live.

### Tools

Every tool except `list_clients` takes a `clientId`, so an agent can drive several tabs independently.

| Tool | What it does |
| --- | --- |
| `list_clients` | Connected tabs with their live state. Call it first. |
| `get_state` | Angles, Bloch vector, amplitudes, purity, probabilities, history and sequences of one tab |
| `apply_gate` | I, X, Y, Z, H, S, Sdg, T, Tdg, SX, or Rx, Ry, Rz, P with an angle. Answers after the animation. |
| `set_state` / `set_preset` | Place the state by angles or jump to a cardinal state |
| `measure` / `run_shots` | One collapsing measurement, or many samples without collapse |
| `set_precession` / `set_decoherence` | Larmor precession; T1, T2 and depolarizing relaxation |
| `explain` / `clear_explanation` | Caption over the sphere, with an optional KaTeX formula |
| `highlight_axis` | Make an axis glow while talking about it |
| `reset` / `undo` / `clear_trail` | Housekeeping |
| `create_sequence` / `list_sequences` / `delete_sequence` | Prepare a named stack of moves that the learner runs step by step from the Secuencias panel |

Sequence steps use the same action names and arguments as the tools, plus an optional `note` shown to the learner when the step runs:

```json
{
  "clientId": "tab-1",
  "name": "relative-phase",
  "steps": [
    { "action": "set_preset", "preset": "|0>", "note": "We start at the north pole." },
    { "action": "apply_gate", "gate": "H", "note": "H takes |0> to the equator, on +X." },
    { "action": "apply_gate", "gate": "S", "note": "S turns 90 degrees around Z: now we are on +Y." },
    { "action": "run_shots", "basis": "Y", "shots": 1000 }
  ]
}
```

If a command times out, the tab may still apply it later, so the error tells the agent to call `get_state` before retrying.

## What each panel teaches

- **Secuencias**: run the sequences prepared by the agent, one step at a time.
- **Estado**: set the state through theta and phi, or jump to the six cardinal states.
- **Compuertas**: every gate animated as a rigid rotation around the axis derived from its matrix, with a mini circuit and undo.
- **Dinámica**: Larmor precession and relaxation, where the vector moves inside the sphere as the state becomes mixed.
- **Lectura matemática**: live KaTeX readout of the ket, the Bloch vector, the density matrix and the purity, updated during animations.
- **Medición**: probabilities in X, Y and Z, collapse, and experimental versus theoretical histograms.
- **Lecciones**: eight lessons with auto-checked challenges.

## Configuration

Copy `.env.example` to `.env` to override the defaults.

| Variable | Default | Used by | Meaning |
| --- | --- | --- | --- |
| `BLOCH_WS_HOST` | `127.0.0.1` | server | Bridge interface. A non-loopback host requires a token. |
| `BLOCH_WS_PORT` | `7331` | server | Bridge port |
| `BLOCH_ALLOWED_ORIGINS` | app origins on ports 5180 and 4180 | server | Comma-separated page origins allowed to connect |
| `BLOCH_BRIDGE_TOKEN` | none | server | Shared secret, at least 16 characters, required from every tab when set |
| `BLOCH_MAX_CLIENTS` | `16` | server | Maximum connected tabs |
| `BLOCH_LOG_LEVEL` | `info` | server | `silent` disables the stderr log |
| `VITE_BLOCH_WS_URL` | `ws://localhost:7331` | page | Bridge URL |
| `VITE_BLOCH_BRIDGE_TOKEN` | none | page | Token sent by the page. It is embedded in the bundle, so it protects the bridge from other origins and processes, not from people who can load the page. |

## Security model

WebSocket connections are not covered by CORS, so any page in the browser could try to reach the bridge. The server therefore:

- listens on loopback only unless a token is configured,
- accepts only the app origins by default,
- validates every message from a page against a schema with bounded lengths, and quotes page-reported names in tool output so they read as data rather than instructions,
- caps payload size and the number of clients, and drops tabs that stop answering pings.

## Development

| Command | What it runs |
| --- | --- |
| `pnpm dev` | App on http://localhost:5180 |
| `pnpm mcp` | MCP server by hand |
| `pnpm typecheck` | App, server and tooling configs |
| `pnpm lint` | oxlint |
| `pnpm test` | Vitest |
| `pnpm build` / `pnpm preview` | Production build, served on http://localhost:4180 |
| `pnpm verify` | Everything CI runs |

Every command has a `make` equivalent (`make help`). GitHub Actions runs `typecheck`, `lint`, `test` and `build` on every push and pull request.

The tests cover:

- the physics, including the invariant that every gate's rotation of the Bloch vector equals its matrix acting on the ket, and that relaxation does not depend on how time is split into ticks,
- the stores, command execution, sequences and persistence,
- the server configuration, schemas, message validation and formatting,
- the WebSocket bridge against real sockets, including origins, tokens, timeouts, reconnection and a busy port,
- the MCP contract, by launching the real server over stdio with the official SDK client and a fake page,
- the server process lifecycle, which must exit cleanly without writing to stdout.

## Architecture

```
src/quantum/     pure physics: complex numbers, gates as SU(2) rotations, measurement, exact relaxation
src/protocol/    contract shared by page and server: vocabulary, messages, ports
src/store/       zustand state and the pure simulation step
src/bridge/      page side of the bridge: command execution, validation, reconnection
src/sequences/   step-by-step sequences
src/sphere/      react-three-fiber scene; physics Z-up is mapped to three.js Y-up in one place
src/panels/      UI panels
src/lessons/     lesson content
server/          MCP server: action table, tools, bridge, configuration
```

The server knows no physics: it validates and forwards commands, and every move has a single implementation in the page, used by both the agent and the sequence runner. The simulation advances by real elapsed time, so the state is correct even when the tab is hidden and the browser throttles its timers.

Built with Vite, React, TypeScript, three.js, @react-three/fiber, drei, KaTeX, zustand, zod, ws and the MCP TypeScript SDK.
