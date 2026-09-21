#!/usr/bin/env python3
"""
Upload the generated cover derivatives to Supabase Storage.

Uses the cover files the ingest already produced. It never contacts Open Library: the
bytes exist locally and re-downloading 27,330 files would be both slow and rude.

Idempotent and resumable. It lists what the bucket already holds and uploads only what is
missing, so an interrupted run is resumed by running it again and a completed run is a
no-op. Nothing is ever uploaded twice.

Object paths mirror the local layout exactly:

    <shard>/<id>-160.jpg
    <shard>/<id>-320.jpg
    <shard>/<id>-640.jpg

which is what `book.cover_key` already stores, so no database value changes.

Credentials come from the environment and nowhere else:

    SUPABASE_S3_ENDPOINT           Storage -> S3 connection
    SUPABASE_S3_REGION             Storage -> S3 connection
    SUPABASE_S3_ACCESS_KEY_ID      Storage -> S3 access keys
    SUPABASE_S3_SECRET_ACCESS_KEY  Storage -> S3 access keys
    SUPABASE_STORAGE_BUCKET        defaults to book-covers

These are WRITE credentials. They belong to this tool and to nothing else: never in the
frontend, never in a NEXT_PUBLIC_ variable, never committed.

Usage:
    scripts/.venv/bin/python scripts/upload-covers.py            # dry run
    scripts/.venv/bin/python scripts/upload-covers.py --upload   # do it
    scripts/.venv/bin/python scripts/upload-covers.py --verify   # check the result
"""

from __future__ import annotations

import argparse
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
COVER_ROOT = REPO_ROOT / "backend" / "data" / "covers"

# Immutable: a cover id never points at different bytes, so it can be cached hard.
CACHE_CONTROL = "public, max-age=31536000, immutable"
CONTENT_TYPE = "image/jpeg"
EXPECTED_WIDTHS = (160, 320, 640)
UPLOAD_THREADS = 8


def fail(message: str) -> None:
    print(f"\nerror: {message}", file=sys.stderr)
    sys.exit(1)


def require_env() -> dict[str, str]:
    """Reads credentials from the environment, and says precisely what is missing."""
    required = [
        "SUPABASE_S3_ENDPOINT",
        "SUPABASE_S3_REGION",
        "SUPABASE_S3_ACCESS_KEY_ID",
        "SUPABASE_S3_SECRET_ACCESS_KEY",
    ]
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        fail(
            "missing environment variables: "
            + ", ".join(missing)
            + "\n       Find them under Storage -> S3 connection and S3 access keys."
            + "\n       Export them in your shell; do not put them in a file in this repo."
        )
    return {
        "endpoint": os.environ["SUPABASE_S3_ENDPOINT"],
        "region": os.environ["SUPABASE_S3_REGION"],
        "key": os.environ["SUPABASE_S3_ACCESS_KEY_ID"],
        "secret": os.environ["SUPABASE_S3_SECRET_ACCESS_KEY"],
        "bucket": os.environ.get("SUPABASE_STORAGE_BUCKET", "book-covers"),
    }


def read_manifest(path: Path) -> set[str]:
    """
    Cover keys the catalogue actually references, one per line.

    Generate it from whichever database the bucket should mirror:

        psql -d goodreads -tAc "SELECT cover_key FROM book" > cover-keys.txt
    """
    if not path.is_file():
        fail(f"manifest not found: {path}")
    stems = {line.strip() for line in path.read_text().splitlines() if line.strip()}
    if not stems:
        fail(f"manifest is empty: {path}")
    return stems


def local_objects(manifest: set[str] | None) -> dict[str, Path]:
    """
    Every local derivative, keyed by the object path it will occupy.

    With a manifest, only derivatives the catalogue references are included. The local
    directory accumulates covers from earlier ingest runs whose books were later rejected
    — uploading those would put objects in the bucket that nothing can ever request, and
    storage quota is finite.
    """
    if not COVER_ROOT.is_dir():
        fail(
            f"no covers at {COVER_ROOT}\n"
            "       Run the ingest first; see docs/INGEST.md."
        )
    objects: dict[str, Path] = {}
    skipped = 0
    for path in COVER_ROOT.rglob("*.jpg"):
        key = path.relative_to(COVER_ROOT).as_posix()
        if manifest is not None and key.rsplit("-", 1)[0] not in manifest:
            skipped += 1
            continue
        objects[key] = path
    if skipped:
        print(f"  skipping {skipped:,} derivatives not referenced by the catalogue")
    return objects


def client(config: dict[str, str]):
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=config["endpoint"],
        region_name=config["region"],
        aws_access_key_id=config["key"],
        aws_secret_access_key=config["secret"],
        # Supabase's S3 interface expects path-style addressing.
        config=Config(
            s3={"addressing_style": "path"},
            retries={"max_attempts": 5, "mode": "standard"},
            max_pool_connections=UPLOAD_THREADS + 4,
        ),
    )


def remote_objects(s3, bucket: str) -> dict[str, int]:
    """Everything already in the bucket, as key -> size. This is what makes it resumable."""
    found: dict[str, int] = {}
    paginator = s3.get_paginator("list_objects_v2")
    pages = 0
    for page in paginator.paginate(Bucket=bucket):
        for item in page.get("Contents", []):
            found[item["Key"]] = item["Size"]
        pages += 1
        if pages % 10 == 0:
            print(f"  listing existing objects… {len(found):,}", flush=True)
    return found


def human(num_bytes: int) -> str:
    value = float(num_bytes)
    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            return f"{value:.1f} {unit}"
        value /= 1024
    return f"{value:.1f} GB"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--upload", action="store_true",
                        help="actually upload (otherwise this is a dry run)")
    parser.add_argument("--verify", action="store_true",
                        help="check counts, size and a representative object of each width")
    parser.add_argument("--manifest", type=Path, metavar="FILE",
                        help="file of cover_key values (one per line) to upload only what "
                             "the catalogue references; generate with "
                             "psql -tAc 'SELECT cover_key FROM book'")
    args = parser.parse_args()

    print("Supabase Storage cover upload")
    print("=" * 62)

    manifest = read_manifest(args.manifest) if args.manifest else None
    if manifest is not None:
        print(f"  manifest      : {len(manifest):,} books referenced by the catalogue")
    else:
        print("  manifest      : none — uploading every local derivative "
              "(pass --manifest to mirror the catalogue instead)")

    local = local_objects(manifest)
    local_bytes = sum(path.stat().st_size for path in local.values())
    books = len({key.rsplit("-", 1)[0] for key in local})

    print(f"  local objects : {len(local):,}")
    print(f"  local size    : {human(local_bytes)}")
    print(f"  distinct books: {books:,}")

    incomplete = [
        stem for stem in {k.rsplit("-", 1)[0] for k in local}
        if any(f"{stem}-{w}.jpg" not in local for w in EXPECTED_WIDTHS)
    ]
    if incomplete:
        print(f"  ! {len(incomplete):,} books are missing a derivative "
              f"(e.g. {incomplete[0]}) — re-run the ingest to regenerate them")

    config = require_env()
    try:
        s3 = client(config)
    except Exception as cause:  # noqa: BLE001
        fail(f"could not create the storage client: {cause}")
    bucket = config["bucket"]
    print(f"  bucket        : {bucket}")
    print(f"  endpoint      : {config['endpoint']}")

    print("\nlisting what the bucket already holds…")
    try:
        remote = remote_objects(s3, bucket)
    except Exception as cause:  # noqa: BLE001 - surfaced verbatim to the operator
        fail(f"could not list the bucket: {cause}")

    print(f"  already uploaded: {len(remote):,} ({human(sum(remote.values()))})")

    # Re-upload anything whose size does not match: a truncated object from an
    # interrupted run would otherwise be kept forever.
    pending = {
        key: path for key, path in local.items()
        if key not in remote or remote[key] != path.stat().st_size
    }
    mismatched = sum(
        1 for key in local
        if key in remote and remote[key] != local[key].stat().st_size
    )

    print(f"  to upload       : {len(pending):,}"
          + (f"  (including {mismatched:,} size mismatches)" if mismatched else ""))

    orphans = set(remote) - set(local)
    if orphans:
        print(f"  ! {len(orphans):,} objects in the bucket have no local counterpart "
              "— left alone, not deleted")

    if args.verify:
        verify(s3, bucket, local, remote)
        return

    if not pending:
        print("\nNothing to do — the bucket already matches local.")
        return

    if not args.upload:
        pending_bytes = sum(path.stat().st_size for path in pending.values())
        print(f"\nDRY RUN. Would upload {len(pending):,} objects ({human(pending_bytes)}).")
        print("Re-run with --upload to perform it.")
        return

    print(f"\nuploading {len(pending):,} objects on {UPLOAD_THREADS} threads…")
    done = 0
    failed: list[tuple[str, str]] = []
    lock = threading.Lock()

    def put(key: str, path: Path) -> None:
        nonlocal done
        s3.upload_file(
            str(path), bucket, key,
            ExtraArgs={"ContentType": CONTENT_TYPE, "CacheControl": CACHE_CONTROL},
        )
        with lock:
            done += 1
            if done % 500 == 0:
                print(f"  {done:,} / {len(pending):,}", flush=True)

    with ThreadPoolExecutor(max_workers=UPLOAD_THREADS) as pool:
        futures = {pool.submit(put, key, path): key for key, path in pending.items()}
        for future in as_completed(futures):
            try:
                future.result()
            except Exception as cause:  # noqa: BLE001
                failed.append((futures[future], str(cause)))

    print(f"\nuploaded {done:,}; failed {len(failed):,}")
    for key, reason in failed[:5]:
        print(f"  ! {key}: {reason}")
    if failed:
        print("Re-run to retry only what is still missing.")
        sys.exit(1)

    verify(s3, bucket, local, remote_objects(s3, bucket))


def verify(s3, bucket: str, local: dict[str, Path], remote: dict[str, int]) -> None:
    """Counts, size, and one real object at each width."""
    print("\nverification")
    print("-" * 62)
    local_bytes = sum(path.stat().st_size for path in local.values())
    remote_bytes = sum(remote.values())

    print(f"  objects  local {len(local):,}   remote {len(remote):,}   "
          f"{'MATCH' if len(remote) >= len(local) else 'MISSING ' + str(len(local) - len(remote))}")
    print(f"  bytes    local {human(local_bytes)}   remote {human(remote_bytes)}")

    missing = [key for key in local if key not in remote]
    if missing:
        print(f"  ! {len(missing):,} objects missing, e.g. {missing[:3]}")

    # A representative object of each width, fetched rather than assumed present.
    public_base = os.environ.get("COVERS_BASE_URL")
    for width in EXPECTED_WIDTHS:
        sample = next((k for k in sorted(local) if k.endswith(f"-{width}.jpg")), None)
        if not sample:
            print(f"  ! no local object at width {width}")
            continue
        try:
            head = s3.head_object(Bucket=bucket, Key=sample)
            print(f"  {width:>3}px  {sample:<28} {human(head['ContentLength']):>9}  "
                  f"{head.get('ContentType', '?')}")
        except Exception as cause:  # noqa: BLE001
            print(f"  ! {width}px {sample}: {cause}")

    if public_base:
        print("\n  public URLs to check in a browser:")
        for width in EXPECTED_WIDTHS:
            sample = next((k for k in sorted(local) if k.endswith(f"-{width}.jpg")), None)
            if sample:
                print(f"    {public_base.rstrip('/')}/{sample}")
    else:
        print("\n  set COVERS_BASE_URL to also print public URLs to check")


if __name__ == "__main__":
    main()
