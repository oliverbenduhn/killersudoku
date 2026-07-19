// Konstanter Storage-Prefix für localforage. Konfigurierbarkeit über
// Build-Time-Variablen war im CRA-Setup möglich; im Vite-Setup ist der
// Override unnötig (nicht aus den User-Flows heraus konfigurierbar).
// Bei echtem Bedarf später über env-Loader ergänzen.

export const STORAGE_PREFIX = 'killersudoku_';
export const GAME_STATE_PREFIX = `${STORAGE_PREFIX}level-`;
