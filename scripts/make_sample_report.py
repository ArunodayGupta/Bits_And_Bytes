"""scripts/make_sample_report.py
Generates a synthetic laboratory report PNG using Pillow.
Matches the canned MockOcrProvider output.
Saves to fixtures/sample-lab-report.png and copies to frontend/public/sample-lab-report.png.
"""

import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = Path(__file__).resolve().parent.parent
FIXTURES_DIR = ROOT_DIR / "fixtures"
FRONTEND_PUBLIC_DIR = ROOT_DIR / "frontend" / "public"


def create_sample_lab_report():
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    # 800 x 600 clean medical report layout
    width, height = 800, 600
    image = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(image)

    # Header section
    draw.rectangle([(0, 0), (width, 80)], fill=(30, 58, 138))  # Dark Blue banner
    draw.text((30, 25), "HEALTHSAFE DIAGNOSTIC CENTRE", fill=(255, 255, 255))
    draw.text((550, 30), "ISO 15189 ACCREDITED", fill=(219, 234, 254))

    # Patient Demographic Bar
    draw.rectangle([(30, 95), (width - 30, 155)], fill=(241, 245, 249), outline=(203, 213, 225))
    draw.text((45, 105), "Patient Name: Ramesh Kumar", fill=(15, 23, 42))
    draw.text((45, 125), "ABHA ID: 91-1234-5678-9012", fill=(71, 85, 105))
    draw.text((400, 105), "Report Date: 20/10/2024", fill=(15, 23, 42))  # Day-first format
    draw.text((400, 125), "Sample ID: SYN-LAB-202410-001", fill=(71, 85, 105))

    # Table Header
    y_table = 180
    draw.rectangle([(30, y_table), (width - 30, y_table + 35)], fill=(226, 232, 240))
    draw.text((45, y_table + 10), "Test Name", fill=(15, 23, 42))
    draw.text((320, y_table + 10), "Result", fill=(15, 23, 42))
    draw.text((440, y_table + 10), "Unit", fill=(15, 23, 42))
    draw.text((560, y_table + 10), "Reference Range", fill=(15, 23, 42))

    # Table Rows
    rows = [
        ("HbA1c", "7.2", "%", "< 5.7 % (Normal)"),
        ("Fasting Blood Sugar", "118", "mg/dL", "70 - 99 mg/dL"),
        ("TSH", "2.9", "uIU/mL", "0.4 - 4.5 uIU/mL"),
    ]

    curr_y = y_table + 45
    for idx, (test, res, unit, ref) in enumerate(rows):
        # Row divider line
        draw.line([(30, curr_y - 8), (width - 30, curr_y - 8)], fill=(226, 232, 240))
        draw.text((45, curr_y), test, fill=(30, 41, 59))
        draw.text((320, curr_y), res, fill=(15, 23, 42))
        draw.text((440, curr_y), unit, fill=(71, 85, 105))
        draw.text((560, curr_y), ref, fill=(100, 116, 139))
        curr_y += 40

    draw.line([(30, curr_y), (width - 30, curr_y)], fill=(203, 213, 225))

    # Disclaimer footer
    draw.text(
        (45, 480),
        "Decision Support Notice: Extracted parameters require clinical correlation.",
        fill=(100, 116, 139),
    )
    draw.text(
        (45, 510),
        "Demo synthetic report. Generated for demonstration purposes only.",
        fill=(148, 163, 184),
    )

    out_fixture = FIXTURES_DIR / "sample-lab-report.png"
    out_public = FRONTEND_PUBLIC_DIR / "sample-lab-report.png"

    image.save(out_fixture, "PNG")
    shutil.copy2(out_fixture, out_public)
    print(f"Generated synthetic report image at:\n  - {out_fixture}\n  - {out_public}")


if __name__ == "__main__":
    create_sample_lab_report()
