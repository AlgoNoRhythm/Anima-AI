from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend


def parse_pdf(file_path: str) -> dict:
    """Parse a PDF file using Docling and return structured output."""
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = False  # Disable OCR for speed, can be enabled later
    pipeline_options.do_table_structure = True

    converter = DocumentConverter(
        allowed_formats=[InputFormat.PDF],
        format_options={
            InputFormat.PDF: {
                "pipeline_options": pipeline_options,
                "backend": PyPdfiumDocumentBackend,
            }
        },
    )

    result = converter.convert(file_path)
    doc = result.document

    pages = {}

    # Process document items (text blocks, tables, etc.)
    for item, _level in doc.iterate_items():
        # Get page number from provenance
        page_nums = set()
        if hasattr(item, "prov") and item.prov:
            for prov in item.prov:
                if hasattr(prov, "page_no"):
                    page_nums.add(prov.page_no)

        for page_num in page_nums or [0]:
            if page_num not in pages:
                pages[page_num] = {"page_number": page_num, "sections": [], "tables": []}

            # Get bounding box if available
            bbox = None
            if hasattr(item, "prov") and item.prov:
                for prov in item.prov:
                    if hasattr(prov, "bbox") and prov.bbox:
                        bbox = {
                            "l": prov.bbox.l,
                            "t": prov.bbox.t,
                            "r": prov.bbox.r,
                            "b": prov.bbox.b,
                        }
                        break

            # Determine if this is a table or text section
            item_type = getattr(item, "label", "text") if hasattr(item, "label") else "text"

            if "table" in str(item_type).lower():
                # Export table as markdown
                table_md = item.export_to_markdown() if hasattr(item, "export_to_markdown") else str(item)
                pages[page_num]["tables"].append({
                    "markdown": table_md,
                    "bbox": bbox,
                })
            else:
                # Regular text section
                text = item.export_to_markdown() if hasattr(item, "export_to_markdown") else str(item)
                if text and text.strip():
                    # Try to detect section title
                    title = None
                    if hasattr(item, "label") and "heading" in str(item.label).lower():
                        title = text.strip()

                    pages[page_num]["sections"].append({
                        "title": title,
                        "text": text.strip(),
                        "bbox": bbox,
                    })

    # Sort by page number and convert to list
    sorted_pages = [pages[k] for k in sorted(pages.keys()) if k > 0]

    return {
        "pages": sorted_pages,
        "total_pages": len(sorted_pages),
        "filename": file_path.split("/")[-1].split("\\")[-1],
    }
