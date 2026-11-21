from pathlib import Path
from math import cos, sin, radians
from PIL import Image, ImageDraw
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
INK, TEAL, DEEP, PAPER, MINT, AMBER = '#142e30', '#176958', '#163b3a', '#fbfaf5', '#d9ece1', '#ffedcc'


def make_mark():
    image = Image.new('RGBA', (240, 240))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, 239, 239), radius=72, fill=DEEP)
    line = Image.new('RGBA', image.size)
    loop = ImageDraw.Draw(line)
    loop.rounded_rectangle((60, 83, 177, 157), radius=35, outline=PAPER, width=11)
    line = line.rotate(36, resample=Image.Resampling.BICUBIC)
    image.alpha_composite(line)
    dot = ImageDraw.Draw(image)
    dot.ellipse((148, 50, 186, 88), fill='#a1e0b6', outline=DEEP, width=4)
    image.save(ROOT / 'design/route-loop.png')
    image.resize((64, 64), Image.Resampling.LANCZOS).save(ROOT / 'app/icon.png')


def text(pdf, x, y, content, size=11, color=INK, bold=False):
    pdf.setFillColor(HexColor(color))
    pdf.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
    pdf.drawString(x, y, content)


def brand_kit():
    output = ROOT / 'output/pdf'
    output.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(output / 'RastaLoop-brand-kit.pdf'), pagesize=A4)
    pdf.setTitle('RastaLoop Brand Kit')
    pdf.setAuthor('RastaLoop CityFix team')
    width, height = A4
    pdf.setFillColor(HexColor(PAPER))
    pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setFillColor(HexColor(DEEP))
    pdf.rect(0, height - 300, width, 300, fill=1, stroke=0)
    text(pdf, 43, 790, 'RASTALOOP / BRAND KIT', 11, '#b9d5c8', True)

    pdf.setStrokeColor(Color(.49, .73, .63, .3))
    pdf.setLineWidth(1.3)
    for distance in (48, 65, 82):
        pdf.circle(516, 667, distance, fill=0, stroke=1)
    for degrees in (22, 148, 265):
        pdf.setFillColor(HexColor('#8ec7ad'))
        pdf.circle(516 + 65 * cos(radians(degrees)), 667 + 65 * sin(radians(degrees)), 3, fill=1, stroke=0)

    pdf.drawImage(str(ROOT / 'design/route-loop.png'), 41, 666, width=69, height=69, mask='auto')
    text(pdf, 121, 680, 'RastaLoop', 52, '#f8fbf2', True)
    text(pdf, 43, 618, 'See what blocks the way.', 24, '#f8fbf2')
    text(pdf, 43, 585, 'Verify what opens it.', 24, '#b4dac4', True)

    text(pdf, 43, 509, 'Color', 23, bold=True)
    colors = [('Deep teal', DEEP), ('Route teal', TEAL), ('Paper', PAPER), ('Route mint', MINT), ('Barrier amber', AMBER)]
    for index, (label, fill) in enumerate(colors):
        x = 43 + index * 103
        pdf.setFillColor(HexColor(fill))
        pdf.setStrokeColor(HexColor('#d5dfd6'))
        pdf.roundRect(x, 440, 96, 45, 7, fill=1, stroke=1)
        text(pdf, x, 422, label, 10, bold=True)
        text(pdf, x, 408, fill.upper(), 9, '#48615b')

    pdf.setStrokeColor(HexColor('#d6e1d8'))
    pdf.line(43, 378, width - 43, 378)
    text(pdf, 43, 343, 'Typography', 22, bold=True)
    text(pdf, 43, 309, 'Clinic access restored', 18, bold=True)
    text(pdf, 43, 282, 'Segoe UI Variable and system fallbacks', 11, '#48615b')
    text(pdf, 43, 264, 'Use sentence case and clear route labels.', 11, '#48615b')

    text(pdf, 320, 343, 'Voice', 22, bold=True)
    text(pdf, 320, 309, 'Name what changed', 18, bold=True)
    text(pdf, 320, 282, 'Say which trip, which barrier, and', 11, '#48615b')
    text(pdf, 320, 264, 'when the passage was checked.', 11, '#48615b')

    pdf.setFillColor(HexColor(MINT))
    pdf.roundRect(43, 108, width - 86, 111, 12, fill=1, stroke=0)
    text(pdf, 61, 184, 'Visual identity', 18, bold=True)
    text(pdf, 61, 158, 'The loop and marker represent a trip that can change as the street changes.', 11)
    text(pdf, 61, 139, 'Pair meaning with a text label. Mark simulated imagery and corridor data.', 11)
    text(pdf, 43, 56, 'CityFix Buildathon 2026  /  Civic accessibility prototype', 9, '#48615b')
    text(pdf, width - 64, 56, '01', 9, '#48615b')
    pdf.showPage()
    pdf.save()


if __name__ == '__main__':
    make_mark()
    brand_kit()
