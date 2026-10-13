# Pending: Danfoss AUTO button

Provider support for alternate mode entities was added at the user's request.
Validation on the originally affected installation remains pending.

Collect the integration name/version and the operation-mode entity's ID,
state, and `options` from Home Assistant Developer Tools → States. Also collect
the fan entity's attributes and the card configuration.

The adapter now recognizes both `operation_mode` and `run_mode` metadata,
and a single `auto`, `automatic`, `automatisk`, or `Demand` option, or the
explicit `auto_option`. Ambiguous matches require explicit entity mapping.
One possible mismatch is the Danfoss Air CCM integration's Run Mode select,
whose options are `Demand`, `Program`, and `Manual`:
https://github.com/ikar303/ha-danfoss-air-ccm/blob/main/custom_components/danfoss_air_ccm/select.py

Provider and browser service-dispatch regression tests cover Run Mode/Demand,
renamed entities and ambiguous matches. Confirm the affected integration's
entity data and AUTO behavior when users are available.
