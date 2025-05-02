// Diese Datei definiert Routing-Regeln für Copilot MCP-Anfragen

module.exports = {
  // Anfragen zu Dokumentation an context7 weiterleiten
  documentationQueries: {
    serverName: "context7",
    criteria: [
      { type: "contains", keywords: ["dokumentation", "api", "referenz", "beispiel"] },
      { type: "startsWith", keywords: ["wie funktioniert", "erkläre"] }
    ]
  },
  
  // Code-Beispiele von GitHub abrufen
  codeExamples: {
    serverName: "github",
    criteria: [
      { type: "contains", keywords: ["beispielcode", "implementierung", "muster"] },
      { type: "regex", pattern: "wie (kann|würde) man [a-z]+ (implementieren|umsetzen)" }
    ]
  },
  
  // Projektspezifische Anfragen an memory-Server senden
  projectContext: {
    serverName: "memory",
    criteria: [
      { type: "contains", keywords: ["unser projekt", "bisherige", "früher"] },
      { type: "filePattern", patterns: ["*.tsx", "*.ts"] }
    ]
  },
  
  // Standardprioritäten für Server
  priority: ["memory", "context7", "github"]
}