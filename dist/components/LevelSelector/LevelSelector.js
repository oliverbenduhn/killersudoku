"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_2 = require("@chakra-ui/react");
const levelService_1 = require("../../services/levelService");
const LevelSelector = ({ currentLevel, onLevelChange }) => {
    const [inputValue, setInputValue] = (0, react_1.useState)(currentLevel.toString());
    const toast = (0, react_2.useToast)();
    // Responsive Anpassungen
    const showLevelText = (0, react_2.useBreakpointValue)({ base: true, md: true });
    const inputWidth = (0, react_2.useBreakpointValue)({ base: "60px", md: "70px" });
    const fontSize = (0, react_2.useBreakpointValue)({ base: "sm", md: "md" });
    (0, react_1.useEffect)(() => {
        setInputValue(currentLevel.toString());
    }, [currentLevel]);
    const handleInputChange = (valueAsString) => {
        setInputValue(valueAsString);
        const level = parseInt(valueAsString, 10);
        if (!isNaN(level) && level >= 1 && level <= levelService_1.TOTAL_LEVELS) {
            onLevelChange(level);
        }
    };
    const handleInputBlur = () => {
        const level = parseInt(inputValue, 10);
        if (isNaN(level) || level < 1 || level > levelService_1.TOTAL_LEVELS) {
            toast({
                title: 'Ungültige Eingabe',
                description: `Bitte geben Sie eine Zahl zwischen 1 und ${levelService_1.TOTAL_LEVELS} ein.`,
                status: 'error',
                duration: 3000,
                isClosable: true,
                position: "bottom",
                variant: "subtle",
                containerStyle: {
                    marginBottom: '60px',
                    maxWidth: '90%',
                    bg: 'rgba(0,0,0,0.9)',
                    color: 'white',
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
                }
            });
            setInputValue(currentLevel.toString());
        }
    };
    // Berechnet die ungefähre Schwierigkeit basierend auf der Level-Nummer
    const getDifficultyBadge = () => {
        const difficultyIndex = Math.ceil((currentLevel / levelService_1.TOTAL_LEVELS) * 5);
        const difficulties = [
            { color: "green", text: "Einfach" },
            { color: "teal", text: "Leicht" },
            { color: "blue", text: "Mittel" },
            { color: "orange", text: "Schwer" },
            { color: "red", text: "Experte" }
        ];
        const difficulty = difficulties[difficultyIndex - 1] || { color: "gray", text: "Unbekannt" };
        return ((0, jsx_runtime_1.jsx)(react_2.Badge, { colorScheme: difficulty.color, fontSize: "2xs", px: 1.5, py: 0.5, borderRadius: "full", bg: "whiteAlpha.200", color: "white", children: difficulty.text }));
    };
    return ((0, jsx_runtime_1.jsxs)(react_2.HStack, { spacing: 2, align: "center", justify: "flex-end", h: "100%", children: [showLevelText && ((0, jsx_runtime_1.jsx)(react_2.Text, { color: "whiteAlpha.900", fontSize: fontSize, fontWeight: "400", letterSpacing: "0.15px", children: "Level" })), (0, jsx_runtime_1.jsxs)(react_2.NumberInput, { min: 1, max: levelService_1.TOTAL_LEVELS, value: inputValue, onChange: handleInputChange, width: inputWidth, size: "sm", onBlur: handleInputBlur, children: [(0, jsx_runtime_1.jsx)(react_2.NumberInputField, { textAlign: "center", color: "white", border: "none", bg: "whiteAlpha.200", borderRadius: "4px", _hover: { bg: "whiteAlpha.300" }, _focus: { bg: "whiteAlpha.400", boxShadow: "none" }, fontSize: fontSize, fontWeight: "500", px: 2, h: "32px" }), (0, jsx_runtime_1.jsxs)(react_2.NumberInputStepper, { border: "none", mx: 1, children: [(0, jsx_runtime_1.jsx)(react_2.NumberIncrementStepper, { color: "whiteAlpha.900", _hover: { bg: "whiteAlpha.300" }, border: "none", children: "+" }), (0, jsx_runtime_1.jsx)(react_2.NumberDecrementStepper, { color: "whiteAlpha.900", _hover: { bg: "whiteAlpha.300" }, border: "none", children: "-" })] })] }), getDifficultyBadge()] }));
};
exports.default = LevelSelector;
