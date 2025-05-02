/**
 * MCP-Server-Validierungs-Script
 * Diese Datei überprüft, ob die MCP-Server korrekt konfiguriert sind
 * und ob sie von GitHub Copilot entsprechend genutzt werden.
 */

const fs = require('fs');
const path = require('path');

// Pfade zu den Konfigurationsdateien korrigiert
const CONFIG_PATHS = {
  settings: path.join(__dirname, '../../.vscode/settings.json'),
  copilotSettings: path.join(__dirname, '../../.vscode/copilot-settings.json'),
  routingRules: path.join(__dirname, '../../.vscode/copilot-mcp-routing.js')
};

// Erwartete Server
const EXPECTED_SERVERS = ['memory', 'context7', 'github'];

// Funktion zur Überprüfung der Konfiguration
function validateMcpConfiguration() {
  console.log('Überprüfe MCP-Server-Konfiguration...');
  
  // Überprüfe, ob die Konfigurationsdateien existieren
  const fileChecks = Object.entries(CONFIG_PATHS).map(([key, path]) => {
    const exists = fs.existsSync(path);
    console.log(`${key}: ${exists ? '✅ Vorhanden' : '❌ Fehlt'}`);
    return { key, exists };
  });
  
  if (fileChecks.some(check => !check.exists)) {
    console.error('Einige Konfigurationsdateien fehlen!');
    return false;
  }
  
  // Überprüfe settings.json
  try {
    const settings = JSON.parse(fs.readFileSync(CONFIG_PATHS.settings, 'utf8'));
    
    // Überprüfe, ob autoStart konfiguriert ist
    if (!settings.mcp || !settings.mcp.autoStart || !Array.isArray(settings.mcp.autoStart)) {
      console.error('❌ mcp.autoStart ist nicht korrekt konfiguriert');
      return false;
    }
    
    // Überprüfe, ob alle erwarteten Server in autoStart enthalten sind
    const missingServers = EXPECTED_SERVERS.filter(server => !settings.mcp.autoStart.includes(server));
    if (missingServers.length > 0) {
      console.error(`❌ Folgende Server fehlen in autoStart: ${missingServers.join(', ')}`);
      return false;
    }
    
    // Überprüfe, ob die Server-Konfigurationen vorhanden sind
    for (const server of EXPECTED_SERVERS) {
      if (!settings.mcp.servers || !settings.mcp.servers[server]) {
        console.error(`❌ Konfiguration für Server "${server}" fehlt`);
        return false;
      }
    }
    
    // Überprüfe Copilot-Einstellungen
    if (!settings['github.copilot.advanced'] || !settings['github.copilot.advanced'].prioritizeMCP) {
      console.warn('⚠️ github.copilot.advanced.prioritizeMCP ist nicht aktiviert');
    }
    
    console.log('✅ settings.json ist korrekt konfiguriert');
    
    // Überprüfe copilot-settings.json
    const copilotSettings = JSON.parse(fs.readFileSync(CONFIG_PATHS.copilotSettings, 'utf8'));
    if (!copilotSettings.copilot || !copilotSettings.copilot.mcpServers) {
      console.error('❌ copilot.mcpServers ist nicht konfiguriert in copilot-settings.json');
      return false;
    }
    
    // Überprüfe, ob alle Server in den Copilot-Einstellungen definiert sind
    for (const server of EXPECTED_SERVERS) {
      if (!copilotSettings.copilot.mcpServers[server]) {
        console.error(`❌ Server "${server}" fehlt in copilot-settings.json`);
        return false;
      }
    }
    
    console.log('✅ copilot-settings.json ist korrekt konfiguriert');
    
    // Überprüfe Routing-Regeln
    const routingRules = require(CONFIG_PATHS.routingRules);
    if (!routingRules.priority || !Array.isArray(routingRules.priority)) {
      console.error('❌ priority ist nicht konfiguriert in copilot-mcp-routing.js');
      return false;
    }
    
    console.log('✅ copilot-mcp-routing.js ist korrekt konfiguriert');
    
    console.log('✅ Die MCP-Server-Konfiguration ist korrekt');
    return true;
  } catch (error) {
    console.error('Fehler bei der Überprüfung der Konfiguration:', error);
    return false;
  }
}

// Ausführung der Validierung
validateMcpConfiguration();

module.exports = { validateMcpConfiguration };