"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_2 = require("@chakra-ui/react");
require("./App.css");
const Board_1 = __importDefault(require("./components/Board/Board"));
const LevelSelector_1 = __importDefault(require("./components/LevelSelector/LevelSelector"));
const levelService_1 = require("./services/levelService");
// Android-inspiriertes Theme
const theme = (0, react_2.extendTheme)({
    styles: {
        global: {
            body: {
                fontSize: '1rem',
                lineHeight: 1.6,
                bg: '#f5f5f5', // Typischer Android-Hintergrund
            },
            p: {
                maxWidth: '38rem',
                marginLeft: 'auto',
                marginRight: 'auto',
            }
        }
    },
    fonts: {
        body: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        heading: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    },
    colors: {
        android: {
            primary: "#1976D2",
            primaryDark: "#1565C0",
            accent: "#FF4081",
            background: "#f5f5f5",
            surface: "#ffffff",
            text: "#212121",
            secondaryText: "#757575" // Material Design Grey 600
        }
    }
});
function App() {
    const [currentLevel, setCurrentLevel] = (0, react_1.useState)(1);
    const [levelData, setLevelData] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Responsive Layout-Einstellungen
    const headerHeight = (0, react_2.useBreakpointValue)({ base: "56px", md: "64px" });
    const containerMaxWidth = (0, react_2.useBreakpointValue)({ base: "100%", xl: "container.xl" });
    const showInstructions = (0, react_2.useBreakpointValue)({ base: true, lg: false });
    const statusBarBg = (0, react_2.useColorModeValue)("android.primaryDark", "gray.900");
    const headerBg = (0, react_2.useColorModeValue)("android.primary", "gray.800");
    // Lädt das aktuelle Level basierend auf der Level-Nummer
    (0, react_1.useEffect)(() => {
        const fetchLevel = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const level = await (0, levelService_1.loadLevelByNumber)(currentLevel);
                setLevelData(level);
            }
            catch (err) {
                console.error('Fehler beim Laden des Levels:', err);
                setError(`Level ${currentLevel} konnte nicht geladen werden. Bitte versuchen Sie es mit einem anderen Level.`);
                setLevelData(null);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchLevel();
    }, [currentLevel]);
    const handleLevelChange = (level) => {
        setCurrentLevel(level);
    };
    return ((0, jsx_runtime_1.jsxs)(react_2.ChakraProvider, { theme: theme, children: [(0, jsx_runtime_1.jsx)(react_2.Box, { bg: statusBarBg, h: "24px", position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000 }), (0, jsx_runtime_1.jsx)(react_2.Box, { as: "header", bg: headerBg, py: 0, position: "fixed", top: "24px", left: 0, right: 0, height: headerHeight, boxShadow: "0 2px 4px rgba(0,0,0,0.2)", zIndex: 999, children: (0, jsx_runtime_1.jsx)(react_2.Container, { maxW: containerMaxWidth, h: "100%", px: 2, children: (0, jsx_runtime_1.jsxs)(react_2.Flex, { direction: "row", align: "center", justify: "space-between", h: "100%", gap: 2, children: [(0, jsx_runtime_1.jsx)(react_2.Heading, { as: "h1", color: "white", fontSize: { base: "20px", md: "22px" }, fontWeight: "500", children: "Killer Sudoku" }), (0, jsx_runtime_1.jsx)(react_2.Box, { children: (0, jsx_runtime_1.jsx)(LevelSelector_1.default, { currentLevel: currentLevel, onLevelChange: handleLevelChange }) })] }) }) }), (0, jsx_runtime_1.jsx)(react_2.Box, { pt: { base: "80px", md: "88px" }, pb: 4, minH: "100vh", bg: "android.background", children: (0, jsx_runtime_1.jsxs)(react_2.Container, { maxW: containerMaxWidth, px: 2, mx: "auto", w: "100%", children: [(0, jsx_runtime_1.jsx)(react_2.Box, { className: "game-container", mb: 4, bg: "android.surface", borderRadius: "md", overflow: "hidden", children: (0, jsx_runtime_1.jsx)(Board_1.default, { puzzleId: `level-${currentLevel}`, levelData: levelData, isLoading: isLoading, error: error }) }), showInstructions && ((0, jsx_runtime_1.jsxs)(react_2.Box, { className: "content-container", mt: 4, bg: "android.surface", p: 4, borderRadius: "md", children: [(0, jsx_runtime_1.jsx)(react_2.Heading, { as: "h2", size: "lg", mb: 4, color: "android.text", children: "Spielanleitung" }), (0, jsx_runtime_1.jsx)(react_2.Text, { className: "readable-text", mb: 4, color: "android.secondaryText", children: "Killer Sudoku kombiniert klassisches Sudoku mit mathematischen Herausforderungen. Zus\u00E4tzlich zu den bekannten Sudoku-Regeln m\u00FCssen auch die vorgegebenen Summen in jedem \"K\u00E4fig\" erreicht werden." }), (0, jsx_runtime_1.jsx)(react_2.Text, { className: "readable-text", color: "android.secondaryText", children: "Wie bei normalem Sudoku m\u00FCssen Sie jede Zahl von 1-9 in jeder Zeile, Spalte und 3x3-Region genau einmal platzieren. Dar\u00FCber hinaus m\u00FCssen die Zahlen in jedem farbigen K\u00E4fig (durch gestrichelte Linien angezeigt) die angegebene Summe ergeben. Innerhalb eines K\u00E4figs darf keine Zahl wiederholt werden." })] }))] }) })] }));
}
exports.default = App;
