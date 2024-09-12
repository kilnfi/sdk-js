"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountService = void 0;
const api_1 = require("../api");
class AccountService {
    constructor({ testnet = false }) {
        this.testnet = testnet;
    }
    /**
     * Get all accounts
     */
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get("/v1/accounts");
            return data.accounts;
        });
    }
    /**
     * Get an account by its id
     * @param accountId
     */
    get(accountId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.get(`/v1/accounts/${accountId}`);
            return data;
        });
    }
    /**
     * Create an account with given name and description. The account name must be unique.
     * @param name
     * @param description
     */
    create(name, description) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.post("/v1/accounts", {
                name,
                description: description !== null && description !== void 0 ? description : "",
            });
            return data;
        });
    }
    /**
     * Update given account
     * @param accountId
     * @param name
     * @param description
     */
    update(accountId, name, description) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield api_1.api.put(`/v1/accounts/${accountId}`, {
                name,
                description: description !== null && description !== void 0 ? description : "",
            });
            return data;
        });
    }
}
exports.AccountService = AccountService;
