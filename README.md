# Entre tasas y café, sin la charla

Genera un resumen semanal en viñetas de la última nota de la sección [Entre tasas y café](https://www.lanueva.com/seccion/entre-tasas-y-cafe) de *La Nueva*. Extrae las novedades comerciales de Bahía Blanca y descarta por completo la conversación narrativa.

## Configuración

1. Creá un repositorio en GitHub y subí estos archivos.
2. En **Settings → Secrets and variables → Actions**, agregá el secreto `OPENAI_API_KEY`.
3. Opcionalmente agregá la variable `OPENAI_MODEL` para cambiar el modelo; por defecto usa `gpt-5-mini`.
4. Agregá el secreto `NTFY_TOPIC` con el topic al que está suscripto tu Android. Puede ser solo el nombre del topic (por ejemplo, `mi-topic-secreto`) o una URL completa de un servidor ntfy propio.
5. Si tu servidor ntfy requiere autenticación, agregá también el secreto opcional `NTFY_TOKEN`.

El resultado se guarda y versiona en `output/AAAA-MM-DD.md`.
Al completar el workflow, ntfy recibe una notificación con un enlace directo al resumen. Si el workflow falla, recibe una alerta de prioridad alta con enlace a los logs.

## Ejecución

Podés lanzarlo desde **Actions → Resumen semanal de Entre tasas y café → Run workflow** o desde tu cron externo mediante `repository_dispatch`:

```bash
curl --request POST \
  --url "https://api.github.com/repos/USUARIO/REPO/dispatches" \
  --header "Accept: application/vnd.github+json" \
  --header "Authorization: Bearer TU_TOKEN_FINE_GRAINED" \
  --header "X-GitHub-Api-Version: 2022-11-28" \
  --data '{"event_type":"entre-tasas-domingo"}'
```

El token debe tener permiso de **Contents: read and write** sobre el repositorio. El workflow también admite `workflow_dispatch` si preferís dispararlo mediante la API de workflows.

## Ajustar el criterio editorial

El comportamiento del resumen está concentrado en [config/system-prompt.md](config/system-prompt.md). Podés editarlo sin tocar código.

## Ejecución local

Requiere Node.js 20 o superior y una clave de OpenAI:

```bash
OPENAI_API_KEY=tu_clave npm run run
```
