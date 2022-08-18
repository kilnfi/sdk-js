import { Integrations } from "./integrations";

export type ServiceProps = {
  testnet?: boolean;
  integrations: Integrations | undefined;
}