# Regole di lavoro

Rispondi sempre in italiano.

- Un mod = una cartella `mods/<nome-mod>/` con questi file:
  - `.claude-plugin/plugin.json` ({ "name", "version", "description" })
  - `hooks/hooks.json` ({ "modules": ["./register.ts"] })
  - `hooks/register.ts` (il modulo; il tipo `Register` si importa da 'claude-code')
- Alla radice del repo: `.claude-plugin/marketplace.json` che elenca tutti i mod, ognuno con `source` relativo (es. "./mods/usage-bar"). Ogni mod nuovo va aggiunto lì.
- Per scrivere e testare i mod usa la skill plugin-authoring (caricala con lo strumento Skill prima di scrivere). Se non è disponibile in questa sessione, dimmelo e fermati.
- Prima di ogni commit: lancia `claude plugin validate` su ogni mod e sul repository, e scansiona i file con lo strumento scan_secrets. Se segnala qualcosa, dimmi solo file e tipo di segreto e aspetta il mio via libera.
- Niente push, niente creazione di PR, niente cancellazioni o sovrascritture senza il mio OK esplicito. Lavora su un branch e proponi una PR.
- Non mettere nel repository chiavi, token, dati personali o dati di salute.
- Aggiorna la `version` del mod in `plugin.json` a ogni modifica, altrimenti l'app non vede l'aggiornamento.
