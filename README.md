# TCG LAB NEXT

App Android (Kotlin + Jetpack Compose + SQLite) para gestionar colección y mazos de **Pokémon TCG Pocket**, con propuesta de mazos por IA (xAI/Grok).

## Funciones actuales

- Colección completa (4.317+ cartas) con búsqueda, filtros (Tengo / Me faltan / set) y progreso por set
- Registro de cantidades con updates atómicos
- Lista de deseados (wishlist)
- Constructor manual de mazos (máx. 2 copias por nombre, 1–3 energías, 20 cartas)
- Generación de mazos con IA (clave y modelo configurables)
- Exportar / importar colección en JSON
- Tema oscuro y claro
- QR de mazos

## Compilar

```bash
./gradlew assembleDebug
```

El APK queda en `app/build/outputs/apk/debug/`.

## Configuración de IA

1. Obtén una clave en [console.x.ai](https://console.x.ai)
2. En la app: Inicio → engranaje → pega la clave (`xai-...`) y el modelo deseado
3. La clave se guarda localmente y solo se envía a xAI al generar un mazo

## Exportar / importar

En Ajustes puedes exportar tu colección como JSON y pegarlo para importar (modo sumar o reemplazar).

## Aviso legal

App fan **no oficial**.  
Pokémon, Pokémon TCG Pocket y las marcas asociadas son propiedad de Nintendo / Creatures / GAME FREAK.  
Las imágenes de cartas provienen de fuentes de terceros. Esta app no está afiliada ni respaldada por The Pokémon Company.

## Privacidad

Todos los datos de colección y mazos se guardan localmente. Solo la generación de mazos por IA envía la lista de cartas a xAI usando la clave del usuario.
