"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const axios_1 = __importDefault(require("axios"));
exports.api = axios_1.default.create();
exports.api.interceptors.response.use((res) => res, (err) => {
    console.log(err);
    throw new Error(err.response.data.message);
});
