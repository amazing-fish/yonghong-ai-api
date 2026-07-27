from __future__ import annotations

import argparse
import ssl
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert a DER encoded .cer/.crt certificate to PEM."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    source = args.input.expanduser().resolve()
    target = args.output.expanduser().resolve()

    if not source.is_file():
        raise FileNotFoundError(f"Input certificate does not exist: {source}")

    data = source.read_bytes()
    if b"-----BEGIN CERTIFICATE-----" in data:
        pem_text = data.decode("ascii")
    else:
        pem_text = ssl.DER_cert_to_PEM_cert(data)

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(pem_text.rstrip() + "\n", encoding="ascii")
    print(target)


if __name__ == "__main__":
    main()
