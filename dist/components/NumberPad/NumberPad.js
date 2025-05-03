"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberPad = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("@chakra-ui/react");
const NumberPad = ({ onNumberSelect, onClear, disabledNumbers = [] }) => {
    // Dunklere Farben für die Buttons
    const buttonBg = 'gray.600';
    const buttonHoverBg = 'gray.700';
    // Responsive Größe für die Buttons und den Nummernblock
    const buttonSize = (0, react_1.useBreakpointValue)({
        base: "40px",
        sm: "45px",
        md: "55px",
        lg: "60px" // Desktop
    }) || "50px";
    const fontSize = (0, react_1.useBreakpointValue)({
        base: "lg",
        sm: "xl",
        md: "xl",
        lg: "2xl" // Desktop
    }) || "xl";
    const padWidth = (0, react_1.useBreakpointValue)({
        base: "180px",
        sm: "200px",
        md: "220px",
        lg: "240px" // Desktop
    }) || "220px";
    const gap = (0, react_1.useBreakpointValue)({
        base: 2,
        sm: 2,
        md: 2,
        lg: 3 // Desktop
    }) || 2;
    return ((0, jsx_runtime_1.jsxs)(react_1.Grid, { templateColumns: "repeat(3, 1fr)", gap: gap, width: padWidth, children: [[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => ((0, jsx_runtime_1.jsx)(react_1.Button, { onClick: () => onNumberSelect(number), bg: buttonBg, color: "white", size: "lg", height: buttonSize, fontSize: fontSize, fontWeight: "bold", _hover: { bg: buttonHoverBg }, _active: { bg: 'gray.800' }, disabled: disabledNumbers.includes(number), children: number }, number))), (0, jsx_runtime_1.jsx)(react_1.Button, { gridColumn: "1 / span 3", onClick: onClear, colorScheme: "red", variant: "solid", size: "lg", height: (0, react_1.useBreakpointValue)({ base: "40px", md: "45px", lg: "50px" }), fontSize: (0, react_1.useBreakpointValue)({ base: "md", md: "lg" }), fontWeight: "bold", children: "L\u00F6schen" })] }));
};
exports.NumberPad = NumberPad;
exports.default = exports.NumberPad;
