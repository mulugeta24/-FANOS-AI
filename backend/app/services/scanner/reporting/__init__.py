from .json_report import generate_json_report

def generate_pdf_report(*args, **kwargs):
    from .pdf_report import generate_pdf_report as _gen
    return _gen(*args, **kwargs)

__all__ = ['generate_pdf_report', 'generate_json_report']

