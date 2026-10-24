# TCG LAB NEXT

Aplicación web React + TypeScript + Tailwind CSS para gestionar tu colección y mazos de **Pokémon TCG Pocket**, con análisis y propuesta de mazos por IA (Grok / motor táctico TCG LAB).

## Funciones

- **Colección completa (4.300+ cartas)**: búsqueda instantánea por nombre o ID, filtros por categoría (Pokémon / Entrenadores), estado de posesión (Tengo / Me faltan), carrusel de expansiones/sets y cálculo de progreso.
- **Registro rápido de copias**: botones de suma y resta con actualización inmediata en almacenamiento local.
- **Lista de deseados (Wishlist)**: marca cartas deseadas y filtra la colección con un toque.
- **Constructor de mazos**: validación de reglas de Pokémon TCG Pocket (exactamente 20 cartas, máx. 2 copias por nombre, 1–3 energías).
- **Generación de mazos con IA**: análisis de colección basado en cartas registradas mediante xAI Grok (o el motor táctico integrado) con justificación estratégica.
- **Exportación e Importación**: exporta tu colección en JSON para respaldos o impórtala (modos sumar o reemplazar).
- **Códigos QR de mazos**: genera un código QR para compartir y guardar tus configuraciones de mazo.
- **Temas**: soporte para tema oscuro y claro.

## Ejecución

```bash
npm install
npm run dev
```

El servidor de desarrollo se inicia en `http://localhost:3000`.

## Aviso legal

App fan **no oficial**. Pokémon, Pokémon TCG Pocket y las marcas asociadas son propiedad de Nintendo / Creatures / GAME FREAK.
