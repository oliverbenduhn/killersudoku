# Spielabschluss, History und Schreibbesitz

## Status

accepted — präzisiert ADR 0003 für Metadaten; ersetzt deren vollständige GameState-Snapshots im Aufrufer.

## Kontext

Vollständige History-Snapshots stellten neben dem Brett auch später verbrauchte
Hinweise wieder her. Asynchrone Statistikbuchungen konnten einen zwischenzeitlichen
Reset überschreiben. Unabhängige Fenster schrieben denselben Spielstand ohne
Konflikterkennung. Diese Übergänge waren im Master-Audit vom 28.10.2026 belegt.

## Entscheidung

- `useUndoRedo` behält die in ADR 0003 beschlossenen Vorher-/Nachher-Paare.
  `useGameState` legt darin ausschließlich Zellwerte und Notiz-Kandidaten ab.
  Undo/Redo stellt diese exakt wieder her. Hinweisverbrauch, Fehlversuche,
  Zeit und Abschlussbuchung sind Metadaten und werden nicht zurückerstattet.
- Gelöst und Game Over sind terminale Zustände. Normale Eingaben, Hinweise
  und Undo/Redo sind dann für alle Eingabewege gesperrt. Reset beginnt einen
  neuen Versuch und leert die History. Bei vorhandenen Spielereingaben fragt
  die Oberfläche vorher nach. Reset bleibt gemäß ADR 0003 nicht rückgängig machbar.
- Der Abschluss wird synchron im Spielzustand markiert. Die Statistik wird
  anschließend idempotent je Puzzle gebucht. `statisticsRecorded` erlaubt
  Wiederholung nach Speicherfehlern oder Reload. Ein asynchrones Ergebnis darf
  Metadaten nur für die noch identische Spielinstanz aktualisieren.
- Pro Puzzle hält die aktive `useGameState`-Instanz einen exklusiven Web Lock.
  Ein zweites Fenster zeigt eine Sperrmeldung mit Wiederholungsaktion. Der Lock
  wird erst nach ausstehenden Schreibvorgängen freigegeben. Browser ohne Web
  Locks erhalten eine verständliche Meldung statt ungeschützter Schreibzugriffe.
- Die bestehende Schreibqueue bleibt ein Serialisierungsprimitiv. Kurze Web
  Locks sichern zusätzlich Read-modify-write der Statistik zwischen Fenstern.
  Ladefehler erzeugen kein beschreibbares Ersatzspiel. Schreibfehler bleiben
  sichtbar und können erneut versucht werden.

## Konsequenzen

Es entstehen weder Backend noch neuer persistenter Speicherkanal. HTTPS oder
localhost und ein Browser mit Web Locks sind zum Spielen erforderlich. Spielstände
älterer Versionen werden normalisiert; `solved` wird aus dem bereinigten Brett
ermittelt. Hinweis- und Fehlerzähler sind auf 0 bis 3 begrenzt.

Die Statistik zählt weiterhin erstmalig gelöste Puzzle, keine Wiederholungsversuche.
Bestzeiten beziehen sich auf deren erste Abschlüsse. Generator und Detailstatistik
bleiben interne Funktionen ohne zusätzlichen Oberflächeneinstieg. Eine separate
Produktentscheidung kann diese beiden Vorgaben später ändern.
