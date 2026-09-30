# Esfera de Bloch

Simulador interactivo de un qubit. Toda la matemática cuántica está separada de la visualización: si entendés `src/quantum/`, entendés el qubit. La esfera es solo una vista de eso.

## Cómo correrlo

```bash
pnpm install
pnpm dev
```

Producción:

```bash
pnpm build
pnpm preview
```

## Qué enseña cada panel

### Estado

Los ángulos θ y φ fijan un punto en la superficie de la esfera. θ reparte la probabilidad entre |0⟩ y |1⟩; φ es la fase relativa, que no cambia nada en la base Z pero sí en X y en Y. Los seis botones son los estados cardinales.

### Compuertas

Toda compuerta de un qubit es una rotación de la esfera. El eje y el ángulo de cada una no están escritos a mano: se derivan de la matriz con la descomposición n·σ en `src/quantum/rotation.ts`. Durante la animación se dibuja en rosa el eje real de rotación. El circuito de abajo acumula las compuertas aplicadas.

### Dinámica

Precesión de Larmor: un campo constante hace girar el vector alrededor de un eje sin acortarlo. Decoherencia: T1 relaja hacia |0⟩, T2 destruye la fase, y el vector se acorta hasta meterse dentro de la esfera. Un vector más corto es un estado mixto.

### Lectura matemática

El estado en forma rectangular y polar, la forma angular con los números sustituidos, el vector de Bloch, la matriz densidad ρ y la pureza Tr(ρ²). Pureza 1 es un estado puro sobre la superficie.

### Medición

Medir no lee el estado: lo colapsa. Las barras muestran las probabilidades en las bases Z, X e Y. El botón de 1000 tiros compara la frecuencia experimental con la teórica, que es la forma concreta de ver la naturaleza probabilística.

### Lecciones

Ocho lecciones con desafíos que se verifican solos por proximidad del vector de Bloch: qubit, superposición, fase relativa, medición, Pauli, Hadamard, S y T, y estados mixtos.

## Estructura

```
src/quantum/   dominio puro, sin React ni three.js
src/store/     estado de la aplicación (zustand)
src/sphere/    escena 3D (react-three-fiber)
src/panels/    paneles de control y lectura
src/lessons/   contenido educativo
```

El mapeo de coordenadas físicas (Z arriba) a three.js (Y arriba) vive en un único lugar, `src/sphere/coordinates.ts`.

La interfaz está en español; el código y los identificadores, en inglés.
