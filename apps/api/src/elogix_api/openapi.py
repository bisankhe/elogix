"""Emit the OpenAPI spec to stdout, without starting a server.

    uv run python -m elogix_api.openapi > ../../openapi.json

CI runs this and fails if the committed openapi.json differs. That check is what turns a
frontend call to a route that does not exist into a red build rather than a 404 in
production — the single defect class that broke the prototype worst.
"""

import json
import sys

from elogix_api.main import create_app


def main() -> None:
    json.dump(create_app().openapi(), sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
