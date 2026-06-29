# ROBONOMICS-ESP Installer

This project is the webflasher for devices built by the Robonomics team.
It provides a browser-based installer for supported ESP firmware builds.

## Production

[webflasher.robonomics.network](https://webflasher.robonomics.network)

## Altruist firmware channels

The installer provides Stable and Testing firmware for Altruist Urban and
Insight. The selected interface language chooses the matching EN or RU
manifest. Testing firmware is intended for validation before promotion to
Stable and is marked with a warning in the installer.

Legacy `*_DEV.manifest.json` Altruist URLs are kept as compatibility aliases for
the corresponding Testing manifests, but they are no longer shown in the
installer UI.

CI-published Altruist manifests show the firmware version and source commit.
Firmware CI updates this metadata and the cache-busting query with:

```sh
python scripts/update_altruist_manifests.py \
  --channel testing \
  --urban-version R-URB_2026-06.1 \
  --insight-version R-INS_2026-06.1 \
  --commit 0123456789abcdef
```

## Device Integration Guides

- English guide: [README_ADD_DEVICE.md](./README_ADD_DEVICE.md)
- Русская инструкция: [README_ADD_DEVICE_RU.md](./README_ADD_DEVICE_RU.md)
