"""Report generator engine stub."""

from typing import Any, Dict


class ReportGenerator:
    """PDF / Markdown report export engine stub."""

    async def generate_pdf(self, report_data: Dict[str, Any]) -> bytes:
        """Generates PDF binary payload from report data (stub)."""
        return b"%PDF-1.4 stub report content"
