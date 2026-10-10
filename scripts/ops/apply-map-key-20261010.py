"""Apply RSA-OAEP sealed map configuration without exposing plaintext in logs."""
import base64
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile


def apply(env_path, private_key, sealed_path):
    result = subprocess.run(
        ["openssl", "pkeyutl", "-decrypt", "-inkey", str(private_key),
         "-pkeyopt", "rsa_padding_mode:oaep", "-pkeyopt", "rsa_oaep_md:sha256",
         "-pkeyopt", "rsa_mgf1_md:sha256"],
        input=base64.b64decode(sealed_path.read_text().strip(), validate=True),
        capture_output=True, check=True,
    )
    key = result.stdout.decode().strip()
    if not re.fullmatch(r"[A-Z0-9]{5}(?:-[A-Z0-9]{5}){5}", key):
        raise ValueError("invalid format")
    original = env_path.read_text()
    lines = [line for line in original.splitlines()
             if not re.match(r"^\s*(?:export\s+)?TENCENT_MAP_KEY\s*=", line)]
    lines.append("TENCENT_MAP_KEY=" + key)
    backup = env_path.with_name("prod.env.before-location-20261010")
    if not backup.exists():
        shutil.copyfile(env_path, backup)
        os.chmod(backup, 0o600)
    fd, temporary = tempfile.mkstemp(dir=env_path.parent, prefix=".location-env-")
    try:
        with os.fdopen(fd, "w") as output:
            output.write("\n".join(lines) + "\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, env_path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


if __name__ == "__main__":
    try:
        apply(*(Path(argument) for argument in sys.argv[1:]))
        print("private_map_configuration_updated")
    except Exception:
        print("private_map_configuration_update_failed", file=sys.stderr)
        raise SystemExit(1)
