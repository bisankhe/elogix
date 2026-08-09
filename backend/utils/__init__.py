"""FILE: backend/utils/__init__.py"""
from .pagination   import paginate, success, error, created, not_found
from .nepal_law    import check_cba_required, check_probation, check_minimum_wage, calculate_statutory_benefits
from .excel_import import parse_excel_upload, build_template_xlsx
from .voice_input  import transcribe_audio
__all__ = ["paginate","success","error","created","not_found",
           "check_cba_required","check_probation","check_minimum_wage",
           "calculate_statutory_benefits","parse_excel_upload",
           "build_template_xlsx","transcribe_audio"]
