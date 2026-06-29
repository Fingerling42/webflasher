#!/usr/bin/env python3
"""Update Altruist manifest metadata and cache keys after a firmware build."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import quote

MANIFESTS = {
    ("stable", "urban"): (
        "Altruist_URBAN_EN.manifest.json",
        "Altruist_URBAN_RU.manifest.json",
    ),
    ("testing", "urban"): (
        "Altruist_URBAN_EN_TESTING.manifest.json",
        "Altruist_URBAN_EN_DEV.manifest.json",
        "Altruist_URBAN_RU_TESTING.manifest.json",
        "Altruist_URBAN_RU_DEV.manifest.json",
    ),
    ("stable", "insight"): (
        "Altruist_INSIGHT_EN.manifest.json",
        "Altruist_INSIGHT_RU.manifest.json",
    ),
    ("testing", "insight"): (
        "Altruist_INSIGHT_EN_TESTING.manifest.json",
        "Altruist_INSIGHT_EN_DEV.manifest.json",
        "Altruist_INSIGHT_RU_TESTING.manifest.json",
        "Altruist_INSIGHT_RU_DEV.manifest.json",
    ),
}
COMMIT_PATTERN = re.compile(r"^[0-9a-fA-F]{7,40}$")


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--channel", choices=("stable", "testing"), required=True)
    parser.add_argument("--urban-version", required=True)
    parser.add_argument("--insight-version", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument(
        "--manifest-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "manifest",
    )
    return parser.parse_args()


def update_manifest(path: Path, channel: str, version: str, commit: str) -> None:
    """Update one manifest while preserving its firmware layout."""
    manifest = json.loads(path.read_text(encoding="utf-8"))
    short_commit = commit[:7].lower()
    cache_key = quote(f"{version}-{short_commit}", safe="")

    manifest["channel"] = channel
    manifest["version"] = version
    manifest["commit"] = short_commit

    for build in manifest["builds"]:
        for part in build["parts"]:
            firmware_path = part["path"].split("?", maxsplit=1)[0]
            part["path"] = f"{firmware_path}?v={cache_key}"

    path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    """Update manifests for the selected publication channel."""
    args = parse_args()
    if not COMMIT_PATTERN.fullmatch(args.commit):
        raise SystemExit("--commit must contain a 7-40 character hexadecimal SHA")

    versions = {
        "urban": args.urban_version,
        "insight": args.insight_version,
    }
    for model, version in versions.items():
        for file_name in MANIFESTS[(args.channel, model)]:
            update_manifest(
                args.manifest_dir / file_name,
                args.channel,
                version,
                args.commit,
            )


if __name__ == "__main__":
    main()
