import { VentilationProviderAdapter } from "./base.js";

export class GenvexConnectAdapter extends VentilationProviderAdapter {
  get id() { return "genvex_connect"; }
  get label() { return "Genvex Connect"; }
  resolve(key, domain) {
    const explicit = this.config?.entities?.[key];
    if (explicit) return explicit;
    if (!this.hass) return null;
    const aliases = {
      fan_speed:["fan level","fan speed","ventilator trin","ventilator hastighed"],
      boost_enable:["boost"], boost_speed:["boost speed","boost fan speed","boost level","boost step","boost hastighed","boost trin"], boost_duration:["boost duration","boost time","boost timer","boost længde","boost tid"], temp_supply:["temperature supply air","temperatur tilluft"],
      temp_extract:["temperature extract air","temperatur fraluft"], temp_outside:["temperature outside air","temperatur udeluft"],
      temp_exhaust:["temperature exhaust air","temperatur afkastluft"], humidity:["humidity","luftfugtighed"],
      filter_days_left:["days left until filter change","dage til filter skift"], filter_days:["days since filter change","dage siden filter skift","filter days","filterdage"],
      filter_days_setting:["days between filter change","dage mellem filter skift","filter days setting","filter interval"],
      filter_months_setting:["months between filter change","måneder mellem filterskift","filter months setting"],
      filter_reset:["reset filter","nulstil filter"], efficiency:["efficiency","virkningsgrad","varmegenvinding"], bypass_active:["bypass"],
      summer_mode:["summer mode","sommerdrift"], defrost_active:["defrost active","afrimning aktiv"], reheat_active:["reheat active","eftervarme aktiv"],
      fan_rpm_supply:["fan rpm supply","supply fan rpm","indblæsning rpm"], fan_rpm_extract:["fan rpm extract","extract fan rpm","udsugning rpm"],
      cts400_humidity_low_level:["low humidity %","lav luftfugtighed %"],
      cts400_humidity_low_step:["low humidity fan level","lav luftfugtighed trin"],
      cts400_humidity_high_step:["high humidity fan level","høj luftfugtighed trin"],
      cts400_humidity_high_max_time:["high humidity level timeout","høj luftfugtighed trin timeout"]
    };
    return this.discover(key, aliases[key] || [], domain);
  }
}
