"""Turning a report into a spreadsheet.

Every report here answers as JSON for the screen and as CSV for the person who is going
to open it in Excel anyway. A report nobody can export is a report nobody uses.

**Cells are escaped against formula injection.** A cell beginning `=`, `+`, `-`, `@`,
tab or carriage return is executed as a formula by Excel, LibreOffice and Google Sheets
when the file is opened — `=cmd|'/c calc'!A1` in a field, and the download does
something on the reader's machine that the reader never asked for. That is not
theoretical for an HR system: employee names, leave reasons, addresses and document
titles are all free text typed by someone, and the person opening the export is
typically the one being targeted. Prefixing an apostrophe is the standard defence and
it costs a character nobody sees.

**Excel needs the BOM.** Without a UTF-8 byte-order mark, Excel on Windows reads a UTF-8
CSV as the local codepage, and every Devanagari name in the file becomes mojibake. The
BOM is three bytes and it is the difference between a usable export and a support ticket.
"""

import csv
import io
from collections.abc import Iterable, Iterator, Sequence
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi.responses import StreamingResponse

# Characters a spreadsheet treats as the start of a formula.
_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")

BOM = "﻿"


def escape_cell(value: Any) -> str:  # noqa: ANN401
    """Render one value, defused.

    Numbers, dates and decimals are rendered without the guard: they cannot begin a
    formula by construction, and prefixing an apostrophe would leave a spreadsheet full
    of text that looks like numbers and will not sum. Only free text is guarded, which
    is the only place the hazard comes from.
    """
    if value is None:
        return ""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, (int, float, Decimal)):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()

    text = str(value)
    if text.startswith(_FORMULA_PREFIXES):
        return f"'{text}"
    return text


def rows_to_csv(header: Sequence[str], rows: Iterable[Sequence[Any]]) -> Iterator[str]:
    """Stream a CSV, a row at a time.

    Generated rather than assembled so a report over a few thousand employees does not
    build the whole file in memory before the first byte reaches the client.
    """
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\r\n")

    def flush() -> str:
        value = buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)
        return value

    yield BOM
    writer.writerow([escape_cell(cell) for cell in header])
    yield flush()

    for row in rows:
        writer.writerow([escape_cell(cell) for cell in row])
        yield flush()


def csv_response(
    filename: str, header: Sequence[str], rows: Iterable[Sequence[Any]]
) -> StreamingResponse:
    """A CSV download named after the report and the period it covers."""
    return StreamingResponse(
        rows_to_csv(header, rows),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )
