"""
Convert client-facing markdown documents to professional DOCX format.
"""

try:
    from docx import Document
    from docx.shared import Pt, Inches, RGBColor
    import re
    import os
except ImportError:
    print("ERROR: python-docx not installed")
    print("Please run: pip install python-docx")
    exit(1)

def remove_emojis(text):
    """Remove all emojis from text"""
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF"
        "\U0001FA70-\U0001FAFF"
        "]+",
        flags=re.UNICODE
    )
    return emoji_pattern.sub('', text)

def clean_markdown(text):
    text = remove_emojis(text)
    text = re.sub(r'\*\*\*(.+?)\*\*\*', r'\1', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    text = re.sub(r'^-{3,}$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^_{3,}$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\[ \]', '', text)
    text = re.sub(r'\[x\]', '', text, flags=re.IGNORECASE)
    return text.strip()

def add_heading(doc, text, level):
    text = clean_markdown(text)
    if not text:
        return
    heading = doc.add_heading(text, level=level)
    if level == 1:
        heading.style.font.size = Pt(24)
        heading.style.font.color.rgb = RGBColor(0, 0, 0)
        heading.style.font.bold = True
    elif level == 2:
        heading.style.font.size = Pt(18)
        heading.style.font.color.rgb = RGBColor(31, 78, 121)
        heading.style.font.bold = True
    elif level == 3:
        heading.style.font.size = Pt(14)
        heading.style.font.color.rgb = RGBColor(31, 78, 121)
    elif level == 4:
        heading.style.font.size = Pt(12)
        heading.style.font.color.rgb = RGBColor(68, 84, 106)
    return heading

def add_paragraph(doc, text, is_bullet=False, indent_level=0):
    text = clean_markdown(text)
    if not text or text == '---':
        return
    para = doc.add_paragraph(text)
    if is_bullet:
        para.style = 'List Bullet' if indent_level == 0 else f'List Bullet {indent_level + 1}'
    else:
        para.style = 'Normal'
        para.paragraph_format.space_after = Pt(6)
    return para

def process_table(doc, lines, start_index):
    table_lines = []
    i = start_index
    while i < len(lines) and lines[i].strip().startswith('|'):
        line = lines[i].strip()
        if not re.match(r'^\|[\s\-\|:]+\|$', line):
            cells = [clean_markdown(cell.strip()) for cell in line.split('|')[1:-1]]
            if cells and any(cell for cell in cells):
                table_lines.append(cells)
        i += 1
    if table_lines and len(table_lines) > 0:
        num_cols = len(table_lines[0])
        table = doc.add_table(rows=len(table_lines), cols=num_cols)
        table.style = 'Light Grid Accent 1'
        for row_idx, row_data in enumerate(table_lines):
            for col_idx, cell_text in enumerate(row_data):
                if col_idx < len(table.rows[row_idx].cells):
                    table.rows[row_idx].cells[col_idx].text = cell_text
                    if row_idx == 0:
                        table.rows[row_idx].cells[col_idx].paragraphs[0].runs[0].font.bold = True
    return i - start_index

def process_markdown_file(md_path, docx_path):
    print(f"Reading {os.path.basename(md_path)}...")
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    doc = Document()
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
    print("Converting to DOCX...")
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line:
            i += 1
            continue
        if line.startswith('# '):
            add_heading(doc, line[2:], 1)
        elif line.startswith('## '):
            add_heading(doc, line[3:], 2)
        elif line.startswith('### '):
            add_heading(doc, line[4:], 3)
        elif line.startswith('#### '):
            add_heading(doc, line[5:], 4)
        elif line.startswith('- '):
            add_paragraph(doc, line[2:], is_bullet=True, indent_level=0)
        elif line.startswith('  - '):
            add_paragraph(doc, line[4:], is_bullet=True, indent_level=1)
        elif line.startswith('    - '):
            add_paragraph(doc, line[6:], is_bullet=True, indent_level=2)
        elif line.startswith('|'):
            lines_processed = process_table(doc, lines, i)
            i += lines_processed
            continue
        elif line.startswith('```'):
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                i += 1
        else:
            add_paragraph(doc, line)
        i += 1
    print(f"Saving to {os.path.basename(docx_path)}...")
    doc.save(docx_path)
    print(f"  Created successfully\n")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    docs_dir = os.path.join(project_dir, 'docs')

    # Three documents to send to client
    documents = [
        ('PRODUCT_DOCUMENTATION.md', 'PRODUCT_DOCUMENTATION.docx'),
        ('IMPLEMENTATION_GUIDE.md', 'IMPLEMENTATION_GUIDE.docx'),
        ('KNOWLEDGE_BASE.md', 'KNOWLEDGE_BASE.docx'),
    ]

    print("\n" + "="*60)
    print("XLINK CLIENT DOCUMENT CONVERTER")
    print("="*60 + "\n")

    converted = 0
    failed = 0

    for md_file, docx_file in documents:
        md_path = os.path.join(docs_dir, md_file)
        docx_path = os.path.join(docs_dir, docx_file)

        if not os.path.exists(md_path):
            print(f"SKIP: {md_file} (not found)")
            failed += 1
            continue

        try:
            process_markdown_file(md_path, docx_path)
            converted += 1
        except Exception as e:
            print(f"ERROR converting {md_file}: {e}\n")
            failed += 1

    print("="*60)
    print(f"COMPLETE: {converted} documents converted")
    if failed > 0:
        print(f"FAILED: {failed} documents")
    print("="*60)

    if converted > 0:
        print(f"\nReady to send:")
        for _, docx_file in documents:
            docx_path = os.path.join(docs_dir, docx_file)
            if os.path.exists(docx_path):
                print(f"  - {docx_file}")

if __name__ == '__main__':
    main()
