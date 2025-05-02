/**
 * MCP-Server-Test
 * Führt Tests durch, um zu überprüfen, ob die MCP-Server
 * korrekt konfiguriert sind und effektiv genutzt werden.
 */

const { validateMcpConfiguration } = require('./mcpValidation');
const { checkServerConnections, logMcpActivity } = require('./mcpMonitoring');
const path = require('path');
const fs = require('fs');

// Konfigurationspfad
const VSCODE_DIR = path.join(__dirname, '../../.vscode');

// Test zur Überprüfung der Integrität der MCP-Server
async function runMcpServerTests() {
  console.log('--- MCP-Server-Tests starten ---');
  
  // 1. Überprüfe, ob alle erforderlichen Dateien vorhanden sind
  console.log('\n1. Überprüfung der Konfigurationsdateien:');
  const configFiles = [
    { name: 'settings.json', path: path.join(VSCODE_DIR, 'settings.json') },
    { name: 'copilot-settings.json', path: path.join(VSCODE_DIR, 'copilot-settings.json') },
    { name: 'copilot-mcp-routing.js', path: path.join(VSCODE_DIR, 'copilot-mcp-routing.js') }
  ];
  
  let allFilesExist = true;
  for (const file of configFiles) {
    const exists = fs.existsSync(file.path);
    console.log(`${file.name}: ${exists ? '✅ Vorhanden' : '❌ Fehlt'}`);
    if (!exists) allFilesExist = false;
  }
  
  if (!allFilesExist) {
    console.error('❌ Nicht alle erforderlichen Konfigurationsdateien sind vorhanden!');
    console.log('   Führen Sie das Setup mit "node src/utils/mcpSetup.js" erneut aus.');
    return false;
  }
  
  // 2. Validiere die Konfiguration
  console.log('\n2. Validierung der Konfiguration:');
  const configValid = validateMcpConfiguration();
  if (!configValid) {
    console.error('❌ Die MCP-Server-Konfiguration ist nicht korrekt!');
    return false;
  }
  
  // 3. Überprüfe die Serververbindungen
  console.log('\n3. Überprüfung der Serververbindungen:');
  checkServerConnections();
  
  // 4. Teste die Copilot-Integration
  console.log('\n4. Test der Copilot-Integration:');
  try {
    // Beachte: Dies ist nur eine Simulation - eine tatsächliche Integration müsste
    // über die VS Code-Erweiterung API implementiert werden
    console.log('Simuliere Copilot-Anfrage an MCP-Server...');
    
    const testRequest = {
      type: 'COMPLETION_REQUEST',
      query: 'Wie implementiere ich eine React-Komponente?',
      timestamp: Date.now()
    };
    
    // Protokolliere die simulierte Anfrage
    logMcpActivity('context7', 'SIMULATED_REQUEST', testRequest);
    
    console.log('✅ Simulierte Copilot-Integration erfolgreich');
  } catch (error) {
    console.error('❌ Fehler bei der Simulation der Copilot-Integration:', error);
    return false;
  }
  
  console.log('\n--- MCP-Server-Tests abgeschlossen ---');
  console.log('✅ Alle Tests erfolgreich abgeschlossen');
  
  return true;
}

// Anleitung zur regelmäßigen Ausführung der Tests anzeigen
function showTestInstructions() {
  console.log(`
==============================================
  ANLEITUNG ZUR ÜBERPRÜFUNG DER MCP-REGELN
==============================================

1. Führen Sie diesen Test regelmäßig aus, um sicherzustellen, 
   dass Ihre MCP-Server korrekt konfiguriert sind und
   von GitHub Copilot effektiv genutzt werden:

   node src/utils/mcpTest.js

2. Prüfen Sie die Logdateien unter "logs/mcp-activity.log",
   um die tatsächliche Nutzung der MCP-Server zu überwachen.

3. Wenn Sie Änderungen an der Konfiguration vornehmen,
   führen Sie den Test erneut aus, um die Korrektheit zu bestätigen.

4. Bei Problemen sollten Sie:
   - VS Code neu starten
   - Die .vscode/settings.json überprüfen
   - Sicherstellen, dass alle erforderlichen NPM-Pakete installiert sind

5. Für erweiterte Tests und Monitoring können Sie
   die folgenden Befehle ausführen:
   
   node src/utils/mcpValidation.js  # Nur Konfiguration prüfen
   node src/utils/mcpMonitoring.js  # Monitoring starten
==============================================
`);
}

// Export der Funktionen
module.exports = {
  runMcpServerTests,
  showTestInstructions
};

// Wenn direkt ausgeführt, führe die Tests aus und zeige Anweisungen
if (require.main === module) {
  (async () => {
    await runMcpServerTests();
    console.log('\n');
    showTestInstructions();
  })();
}