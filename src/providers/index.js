import { VentilationProviderAdapter } from "./base.js";
import { GenvexConnectAdapter } from "./genvex-connect.js";
import { DanfossAirAdapter } from "./danfoss-air.js";

const providers = new Map();
export function registerProvider({id,name,Adapter,experimental=false,discovery=true}) {
  if (!id || !name || typeof Adapter !== "function" || providers.has(id)) throw new Error("Invalid or duplicate ventilation provider");
  providers.set(id,Object.freeze({id,name,Adapter,experimental,discovery}));
}
export const providerDefinitions = () => [...providers.values()];
export function createProvider(context) {
  const definition=providers.get(context.config?.provider || "genvex_connect");
  if(!definition) throw new Error("Unknown ventilation provider: "+context.config?.provider);
  const adapter=new definition.Adapter(context);
  adapter.definition=definition;
  return adapter;
}
registerProvider({id:"genvex_connect",name:"Genvex Connect",Adapter:GenvexConnectAdapter});
registerProvider({id:"danfoss_air",name:"Danfoss Air",Adapter:DanfossAirAdapter,experimental:true});
registerProvider({id:"generic",name:"Ventilation",Adapter:VentilationProviderAdapter,discovery:false});
export { VentilationProviderAdapter, GenvexConnectAdapter, DanfossAirAdapter };
