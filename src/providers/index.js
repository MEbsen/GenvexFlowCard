import { GenvexConnectAdapter } from "./genvex-connect.js";
import { DanfossAirAdapter } from "./danfoss-air.js";

const PROVIDERS = {
  genvex_connect: GenvexConnectAdapter,
  danfoss_air: DanfossAirAdapter,
};

export function createProvider(card) {
  const id = card.config?.provider || "genvex_connect";
  const Provider = PROVIDERS[id] || GenvexConnectAdapter;
  return new Provider(card);
}

export { GenvexConnectAdapter, DanfossAirAdapter };
