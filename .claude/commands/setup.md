# Auftrag: Nuxt 4 + shadcn-vue Setup

Führe die unten stehenden Schritte aus. Dies ist eine Arbeitsanweisung, keine Dokumentation zum Lesen. Arbeite die Schritte in der angegebenen Reihenfolge ab und bestätige nach jedem Schritt kurz, was gemacht wurde.

## Vorbereitung: Offizielle Docs lesen

Lies **zuerst** die offizielle Installationsseite komplett, bevor du irgendetwas ausführst:

👉 https://www.shadcn-vue.com/docs/installation/nuxt

Befolge die dort beschriebenen Schritte in der dort angegebenen Reihenfolge. Rate **nicht** aus dem Gedächtnis — wenn du unsicher bist, lies die Seite nochmal.

## Package Manager Policy

- Nutze `yarn` für alle Installations- und Script-Befehle innerhalb des Projekts (`yarn add`, `yarn install`, `yarn dev`, etc.)
- Für CLI-Tools, die einmalig ausgeführt werden (Scaffolding, Module hinzufügen), nutze `npx`
- Nutze **kein** `pnpm` und **kein** `bun`, auch wenn die Docs das als Default zeigen

## Umgang mit interaktiven Prompts

Diese Umgebung kann interaktive Prompts schlecht bedienen. Übergib deshalb wo möglich Argumente und Flags direkt (z.B. Projektname als Positional, `--packageManager`, `-y` / `--yes` für Defaults). Wenn ein Befehl trotzdem hängen bleibt: **stoppe und frag**, statt zu raten.

---

## Schritt 1: Nuxt 4 Projekt erstellen

- **Projektname:** `test`
- **Package Manager im Nuxt-Setup:** `npm`/`npx` (yarn wird erst danach für das Projekt selbst genutzt)
- **Git init / ESLint / Module:** Defaults nehmen

Umgehe den interaktiven Prompt, indem du den Projektnamen und Package-Manager-Flag direkt übergibst:

```bash
npx create-nuxt@latest test --packageManager npm
```

Falls das Flag so nicht funktioniert, nutze stattdessen Environment-Variablen oder die `--yes`/`-y` Variante, um Defaults zu akzeptieren. Wenn der Befehl trotzdem interaktiv bleibt: **stoppe und frag mich**, statt zu raten.

Bestätige nach Abschluss, welcher Ordner angelegt wurde (sollte `./test/` sein).

## Schritt 2: TypeScript-Fallback (nur bei Fehler)

Falls beim nächsten Befehl der Fehler `Cannot read properties of undefined (reading 'sys')` auftritt:

```bash
yarn add -D typescript
```

Sonst überspringen.

## Schritt 3: Tailwind CSS via @tailwindcss/vite

Nutze **ausdrücklich** die Variante mit `@tailwindcss/vite`, **nicht** `@nuxtjs/tailwindcss`.

```bash
yarn add -D tailwindcss @tailwindcss/vite
```

## Schritt 4: Tailwind CSS-Datei anlegen

Erstelle (oder überschreibe) `app/assets/css/tailwind.css` mit genau diesem Inhalt:

```css
@import "tailwindcss";
```

## Schritt 5: nuxt.config.ts für Tailwind aktualisieren

Ergänze in `nuxt.config.ts` den Import und die `css`- sowie `vite.plugins`-Einträge:

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  // ...
  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
```

## Schritt 6: shadcn-nuxt Modul installieren

```bash
npx nuxi@latest module add shadcn-nuxt
```

## Schritt 7: nuxt.config.ts für shadcn erweitern

Ergänze in `nuxt.config.ts` das Modul und den shadcn-Block:

```ts
export default defineNuxtConfig({
  // ...
  modules: ['shadcn-nuxt'],
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui'
  }
})
```

## Schritt 8: ssrWidth Plugin (optional, aber empfohlen)

Installiere `@vueuse/core`:

```bash
yarn add @vueuse/core
```

Erstelle `app/plugins/ssr-width.ts`:

```ts
import { provideSSRWidth } from '@vueuse/core'

export default defineNuxtPlugin((nuxtApp) => {
  provideSSRWidth(1024, nuxtApp.vueApp)
})
```

## Schritt 9: Nuxt Prepare

```bash
npx nuxi prepare
```

Dadurch wird der `.nuxt`-Ordner generiert, der für den nächsten Schritt benötigt wird.

## Schritt 10: shadcn-vue initialisieren

```bash
npx shadcn-vue@latest init
```

Wenn nach der Base Color gefragt wird, wähle **`Neutral`**. Bei allen anderen Fragen die sinnvollen Defaults nehmen — falls etwas unklar ist, frag mich.

## Schritt 11: Button-Komponente als Test hinzufügen

```bash
npx shadcn-vue@latest add button
```

## Schritt 12: Custom Tailwind-Variablen hinzufügen

Erst **jetzt**, nachdem das komplette shadcn-Setup abgeschlossen ist, werden meine Custom-Variablen ergänzt. Das ist wichtig, damit `shadcn-vue init` sie nicht überschreibt.

Öffne `app/assets/css/tailwind.css` und **ergänze** den folgenden `@theme inline`-Block. Die bestehenden Imports und shadcn-Variablen dürfen **nicht** verändert werden — nur anhängen. Der Block `@theme inline` ist wichtig, weil sonst Tailwind die `clamp()`-Funktionen vorzeitig auflöst und die Responsivität verloren geht.

```css
@theme inline {
  /* custom breakpoints */
  --breakpoint-3xl: 120rem;
  --breakpoint-4xl: 128rem;

  /* fluid font sizes */
  --text-f-lg: clamp(1rem, 0.97rem + 0.16vw, 1.125rem);       /* 16px - 18px */
  --text-f-xl: clamp(1rem, 0.93rem + 0.33vw, 1.25rem);        /* 16px - 20px */
  --text-f-2xl: clamp(1.125rem, 1.03rem + 0.49vw, 1.5rem);    /* 18px - 24px */
  --text-f-3xl: clamp(1.545rem, 1.46rem + 0.43vw, 1.875rem);  /* 24.72px - 30px */
  --text-f-4xl: clamp(1.75rem, 1.62rem + 0.66vw, 2.25rem);    /* 28px - 36px */
  --text-f-5xl: clamp(2rem, 1.74rem + 1.32vw, 3rem);          /* 32px - 48px */
  --text-f-6xl: clamp(2.45rem, 2.11rem + 1.71vw, 3.75rem);    /* 39.2px - 60px */
  --text-f-7xl: clamp(2.8rem, 2.35rem + 2.24vw, 4.5rem);      /* 44.8px - 72px */
  --text-f-8xl: clamp(3.5rem, 2.84rem + 3.29vw, 6rem);        /* 56px - 96px */
  --text-f-9xl: clamp(4.45rem, 3.52rem + 4.67vw, 8rem);       /* 71.2px - 128px */

  /* fluid spaces */
  --spacing-f-6: clamp(1rem, 0.78rem + 1.11vw, 1.5rem);
  --spacing-f-8: clamp(1.5rem, 1.37rem + 0.66vw, 2rem);
  --spacing-f-12: clamp(2rem, 1.74rem + 1.32vw, 3rem);
  --spacing-f-16: clamp(2.25rem, 1.79rem + 2.30vw, 4rem);
  --spacing-f-20: clamp(2.75rem, 2.16rem + 2.96vw, 5rem);
  --spacing-f-24: clamp(3rem, 2.21rem + 3.95vw, 6rem);
  --spacing-f-28: clamp(3.5rem, 2.58rem + 4.61vw, 7rem);
  --spacing-f-32: clamp(3.75rem, 2.63rem + 5.59vw, 8rem);
  --spacing-f-36: clamp(4.25rem, 3.00rem + 6.25vw, 9rem);
  --spacing-f-40: clamp(4.5rem, 3.05rem + 7.24vw, 10rem);
  --spacing-f-44: clamp(5rem, 3.42rem + 7.89vw, 11rem);
  --spacing-f-48: clamp(5.25rem, 3.47rem + 8.88vw, 12rem);
  --spacing-f-52: clamp(5.75rem, 3.84rem + 9.54vw, 13rem);
  --spacing-f-56: clamp(6rem, 3.89rem + 10.53vw, 14rem);
  --spacing-f-60: clamp(6.5rem, 4.26rem + 11.18vw, 15rem);
  --spacing-f-64: clamp(7rem, 4.63rem + 11.84vw, 16rem);
  --spacing-f-72: clamp(7.5rem, 4.74rem + 13.82vw, 18rem);
  --spacing-f-80: clamp(8.5rem, 5.47rem + 15.13vw, 20rem);
  --spacing-f-96: clamp(10rem, 6.32rem + 18.42vw, 24rem);
}
```

**Wichtig:**
- Falls `shadcn-vue init` bereits einen `@theme inline`-Block erstellt hat, füge die Custom-Variablen **in diesen bestehenden Block** ein, statt einen zweiten anzulegen.
- Bestehende Variablen (Farben, Radien etc. von shadcn) dürfen dabei nicht gelöscht oder verändert werden.

## Schritt 13: Test-Seite erstellen

Erstelle `app/pages/index.vue` mit folgendem Inhalt, um zu verifizieren, dass der Nuxt-Autoimport für shadcn-vue funktioniert:

```vue
<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Nuxt + shadcn-vue Test</h1>
    <Button>Click me</Button>
  </div>
</template>
```

## Schritt 14: Abschluss

**Starte `yarn dev` NICHT automatisch.** Sag mir stattdessen, dass alles fertig ist, und nenne mir den Befehl zum Starten.

---

## Abschluss-Checkliste

Bevor du fertig meldest, prüfe:

- [ ] Nuxt 4 Projekt wurde erstellt
- [ ] Tailwind via `@tailwindcss/vite` eingerichtet (nicht via `@nuxtjs/tailwindcss`)
- [ ] `app/assets/css/tailwind.css` enthält `@import "tailwindcss";`
- [ ] `shadcn-nuxt` Modul ist in `nuxt.config.ts` registriert
- [ ] shadcn-Block in `nuxt.config.ts` ist vorhanden (prefix: '', componentDir: '@/components/ui')
- [ ] `.nuxt` Ordner via `nuxi prepare` generiert
- [ ] `components.json` via `shadcn-vue init` erzeugt
- [ ] Button-Komponente installiert (`app/components/ui/button/`)
- [ ] Custom `@theme inline`-Variablen (breakpoints, fluid font sizes, fluid spaces) in `tailwind.css` ergänzt
- [ ] Test-Seite `app/pages/index.vue` erstellt
- [ ] `yarn dev` wurde **nicht** automatisch gestartet

---

## Wichtige Regeln

- Wenn ein Schritt in den Docs unklar oder abweichend vom Projektzustand ist: **frag mich, rate nicht.**
- Ändere keine Konfigurationen, die nicht explizit in dieser Anleitung oder den verlinkten Docs stehen.
- Nach jedem Schritt kurz bestätigen, was erledigt wurde, bevor du weitermachst.
- Wenn ein Befehl einen Fehler produziert, den diese Anleitung nicht abdeckt: **stoppe und frag mich.**