# Carpy_Mods

Marketplace personale di **mod** per Claude Code: modifiche all'interfaccia o al comportamento di Claude (barra di stato, pannelli, comandi, hook).

Il marketplace si chiama `carpy-mods` ed è definito in `.claude-plugin/marketplace.json`. Ogni mod vive in `mods/<nome-mod>/`.

## Mod disponibili

| Mod | Descrizione |
| --- | --- |
| [`usage-bar`](mods/usage-bar) | Fascia sopra il prompt e barra di stato: % cache, riempimento contesto, token, limiti di consumo (5h, 7g) e costo sessione |

## Installare un mod (app desktop, Code)

1. Clicca **+** accanto al prompt.
2. Scegli **Plugins** → **Add marketplace** e inserisci `ilcarpy/Carpy_Mods`.
3. Scegli **Add plugin**, seleziona il mod (es. `usage-bar`) e installalo con ambito **utente**.

In alternativa, dal prompt di una sessione nel terminale:

```
/plugin install usage-bar --marketplace ilcarpy/Carpy_Mods
```

oppure da shell:

```
claude plugin install usage-bar --marketplace ilcarpy/Carpy_Mods
```

## Aggiornare

A ogni modifica di un mod va alzata la `version` nel suo `.claude-plugin/plugin.json`, altrimenti l'app non vede l'aggiornamento.

## Struttura di un mod

```
mods/<nome-mod>/
├── .claude-plugin/plugin.json   # { "name", "version", "description" }
└── hooks/
    ├── hooks.json               # { "modules": ["./register.ts"] }
    └── register.ts              # il modulo (tipo Register da 'claude-code')
```

Facoltativi: `types/index.d.ts` (contratto dei valori in `$.state`, indicato in `plugin.json` come `"types"`) e `tests/*.test.ts` (si lanciano con `claude plugin test mods/<nome-mod>`).
