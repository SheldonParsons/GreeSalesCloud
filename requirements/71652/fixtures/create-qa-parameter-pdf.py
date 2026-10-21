"""生成可复现的QA上传附件；只含测试标识和指定机型，不编造性能参数。"""
import argparse
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

parser = argparse.ArgumentParser()
for field in ("output", "run-id", "project", "series", "model"):
    parser.add_argument("--" + field, required=True)
parser.add_argument("--font", default="/System/Library/Fonts/STHeiti Light.ttc", help="可嵌入的中文TrueType字体；其他主机请显式指定")
args = parser.parse_args()
output = Path(args.output)
if output.exists():
    raise SystemExit("输出文件已存在；请核对后指定新文件，避免覆盖")
output.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont("QAChinese", args.font, subfontIndex=0))
body = ParagraphStyle("body", fontName="QAChinese", fontSize=11, leading=18, textColor=colors.HexColor("#24364b"))
title = ParagraphStyle("title", parent=body, fontSize=23, leading=31, spaceAfter=10)
small = ParagraphStyle("small", parent=body, fontSize=9, leading=15)
p = lambda text, style=body: Paragraph(escape(text), style)
rows = [
    ("用途", "QA咨询单审批流程及附件上传验证"),
    ("执行标识", args.run_id),
    ("测试项目", args.project),
    ("产品系列", args.series),
    ("参考机型", args.model),
    ("资料内容", "测试占位附件；不包含制冷量、功率等真实性能参数。"),
]
table = Table([[p(k), p(v)] for k, v in rows], colWidths=[94, 389])
table.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eaf1f8")),
    ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#bdcddd")),
    ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d6e0ea")),
    ("LEFTPADDING", (0, 0), (-1, -1), 12),
    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ("TOPPADDING", (0, 0), (-1, -1), 11),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
]))
doc = SimpleDocTemplate(str(output), pagesize=A4, rightMargin=56, leftMargin=56, topMargin=54, bottomMargin=54, title="QA专用参数表附件", author="QA测试")
story = [p("QA专用参数表附件", title), p("需求71652 · 非标产品选型咨询 · 测试资料", small), Spacer(1, 24), table, Spacer(1, 22), p("本文件用于验证审批表单的文件上传、保存和下载路径，不作为实际产品选型依据。", small)]
def footer(canvas, document):
    canvas.setFont("QAChinese", 9)
    canvas.setFillColor(colors.HexColor("#61758b"))
    canvas.drawString(56, 34, "QA TEST ONLY")
    canvas.drawRightString(A4[0] - 56, 34, str(document.page))
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(output)
