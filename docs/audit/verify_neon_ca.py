"""TRAVEL-025.2: offline-only public CA audit. No sockets, DB API or credentials."""

import ctypes
import hashlib
import json
import os
from pathlib import Path
import re
import ssl
import time

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = ROOT / ".local/neon-ca/approved-ca.pem"
SHA256 = "427c064216761a1e72a8b30f0d954d08cb6e4435a82091fb865afd20c8497285"
PEM = re.compile(rb"-----BEGIN CERTIFICATE-----\s+[A-Za-z0-9+/=\r\n]+-----END CERTIFICATE-----")


def require(condition, label):
    if not condition:
        raise ValueError(label)


def check_bytes(data):
    require(hashlib.sha256(data).hexdigest() == SHA256, "pinned checksum mismatch")
    require(b"PRIVATE KEY" not in data, "unexpected key material")
    blocks = PEM.findall(data)
    require(len(blocks) == 118, "unexpected certificate count")
    der = [ssl.PEM_cert_to_DER_cert(block.decode("ascii")) for block in blocks]
    require(len(set(der)) == len(der), "duplicate certificates")
    return der


def main():
    data = BUNDLE.read_bytes()
    der = check_bytes(data)
    published = (BUNDLE.parent / "published.sha256").read_text("ascii").split()[0]
    require(published.lower() == SHA256, "published checksum mismatch")
    official = (BUNDLE.parent / "isrgrootx1.pem").read_text("ascii")
    x1_der = ssl.PEM_cert_to_DER_cert(official)
    require(x1_der in der, "official ISRG Root X1 missing")

    # Empty trust store: load only this explicit file, never ambient system roots.
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.load_verify_locations(cafile=str(BUNDLE))
    certs = context.get_ca_certs()
    require(context.cert_store_stats() == {"x509": 118, "crl": 0, "x509_ca": 118}, "invalid CA store")
    now = time.time()
    require(all(ssl.cert_time_to_seconds(c["notBefore"]) <= now <= ssl.cert_time_to_seconds(c["notAfter"]) for c in certs), "CA date outside validity")

    # Same adjacent OpenSSL/libpq DLLs as portable psql; no PQconnect/SSL_connect.
    binary_dir = ROOT / ".local/postgresql/bin"
    with os.add_dll_directory(str(binary_dir)):
        pq = ctypes.CDLL(str(binary_dir / "libpq.dll"))
        pq.PQlibVersion.restype = ctypes.c_int
        require(pq.PQlibVersion() == 170012, "unexpected libpq version")
        native = ctypes.CDLL(str(binary_dir / "libssl-3-x64.dll"))
        native.TLS_client_method.restype = ctypes.c_void_p
        native.SSL_CTX_new.argtypes = [ctypes.c_void_p]
        native.SSL_CTX_new.restype = ctypes.c_void_p
        native.SSL_CTX_load_verify_locations.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p]
        native.SSL_CTX_load_verify_locations.restype = ctypes.c_int
        native.SSL_CTX_free.argtypes = [ctypes.c_void_p]
        ctx = native.SSL_CTX_new(native.TLS_client_method())
        require(ctx, "OpenSSL context unavailable")
        try:
            require(native.SSL_CTX_load_verify_locations(ctx, str(BUNDLE).encode("utf-8"), None) == 1, "psql OpenSSL CA load failed")
        finally:
            native.SSL_CTX_free(ctx)

    # Fail-closed integrity check, wholly in memory; approved file is untouched.
    try:
        check_bytes(data + b"\n")
    except ValueError:
        pass
    else:
        raise ValueError("tampered bundle accepted")
    print(json.dumps({"status": "PASS", "sha256": SHA256, "bytes": len(data),
        "unique_current_CA_certificates": len(certs), "isrg_root_x1_der_sha256": hashlib.sha256(x1_der).hexdigest(),
        "libpq": 170012, "psql_adjacent_openssl_load": True, "tampered_bundle_rejected": True,
        "network_connections": 0, "neon_handshake_verified": False}))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"status": "FAIL", "error_type": type(error).__name__}))
        raise SystemExit(1) from None
