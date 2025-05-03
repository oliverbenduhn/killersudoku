"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllGameStates = exports.removeGameState = exports.loadGameState = exports.saveGameState = void 0;
const localforage_1 = __importDefault(require("localforage"));
const STORAGE_PREFIX = process.env.REACT_APP_STORAGE_PREFIX || 'killersudoku_';
const saveGameState = async (key, state) => {
    await localforage_1.default.setItem(STORAGE_PREFIX + key, state);
};
exports.saveGameState = saveGameState;
const loadGameState = async (key) => {
    return await localforage_1.default.getItem(STORAGE_PREFIX + key);
};
exports.loadGameState = loadGameState;
const removeGameState = async (key) => {
    await localforage_1.default.removeItem(STORAGE_PREFIX + key);
};
exports.removeGameState = removeGameState;
const clearAllGameStates = async () => {
    await localforage_1.default.clear();
};
exports.clearAllGameStates = clearAllGameStates;
