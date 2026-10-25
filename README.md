# TCG LAB NEXT

Aplicación web (PWA) React + TypeScript + Tailwind CSS para gestionar tu colección y mazos de **Pokémon TCG Pocket**, con propuesta de mazos por IA (xAI Grok) o con el motor táctico local de TCG LAB. Se puede instalar en el celular y funciona sin conexión.

## Funciones

- **Colección completa (4.300+ cartas)**: búsqueda instantánea por nombre o ID (sin distinguir tildes), filtros por categoría, posesión y set, y progreso de colección. La lista se carga por páginas para ir fluida en el móvil.
- **Registro rápido de copias**: botones de suma y resta con guardado inmediato en el dispositivo.
- **Lista de deseados (Wishlist)**.
- **Constructor de mazos**: valida las reglas de Pokémon TCG Pocket (exactamente 20 cartas, máx. 2 copias **por nombre**, 1–3 energías) y permite filtrar tus cartas.
- **Generación de mazos con IA**: usa xAI Grok si configuras una clave; si no, o si falla, usa el motor táctico local (entiende tipos en español: «fuego», «agua», «planta»…).
- **Copia de seguridad**: descarga/importa tu colección en JSON (modos sumar o reemplazar).
- **Códigos QR de mazos** con el contenido del mazo.
- **Tema oscuro y claro**, botón «Atrás» del dispositivo y modo sin conexión.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build      # genera dist/
```

## Instalar en el celular (PWA)

El workflow `.github/workflows/pages.yml` publica la app en GitHub Pages en cada push a `main`
(activa **Settings → Pages → Source: GitHub Actions** una sola vez). Abre la URL en Chrome y elige **Instalar app / Añadir a pantalla de inicio**.

## APK de Android

El workflow `.github/workflows/android-apk.yml` empaqueta la web con Capacitor y deja el **APK debug** como artefacto de la ejecución (pestaña *Actions*) y en cada *Release* de tipo `v*`.

Para generarlo en tu propia máquina (Node 22+, JDK 21, Android SDK y Python con Pillow):

```bash
export ANDROID_HOME=/ruta/al/android-sdk
bash scripts/build-apk.sh      # -> tcg-lab-debug.apk
```

> El APK es de depuración (firmado con la clave debug). Para publicar en Play Store hay que firmar una versión *release* con tu propia clave.

## Notas

- La clave de xAI se guarda solo en el dispositivo y se envía únicamente a `api.x.ai`. Las llamadas directas desde el navegador pueden bloquearse por CORS; en ese caso se usa el motor local automáticamente.
- Las imágenes de cartas se cargan desde CDN externos con varias URLs de respaldo.

## Aviso legal

App fan **no oficial**. Pokémon, Pokémon TCG Pocket y las marcas asociadas son propiedad de Nintendo / Creatures / GAME FREAK.
