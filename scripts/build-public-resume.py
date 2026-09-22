from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas


OUTPUT = Path(__file__).resolve().parents[1] / "static" / "olen-latham-resume.pdf"
FONT_ROOT = Path(r"C:\Windows\Fonts")
pdfmetrics.registerFont(TTFont("Arial", str(FONT_ROOT / "arial.ttf")))
pdfmetrics.registerFont(TTFont("Arial-Bold", str(FONT_ROOT / "arialbd.ttf")))

INK = colors.HexColor("#15212A")
MUTED = colors.HexColor("#46535C")
ACCENT = colors.HexColor("#9B681B")
RULE = colors.HexColor("#D5DDE1")
WIDTH, HEIGHT = letter
LEFT, RIGHT = 48, 564


def text(c, x, y, value, size=9.15, font="Arial", color=INK):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, value)


def link(c, x, y, label, url, size=9):
    text(c, x, y, label, size=size, color=ACCENT)
    width = pdfmetrics.stringWidth(label, "Arial", size)
    c.linkURL(url, (x, y - 2, x + width, y + size + 2), relative=0)
    return width


def section(c, y, title):
    c.setStrokeColor(RULE)
    c.setLineWidth(0.7)
    c.line(LEFT, y + 4, RIGHT, y + 4)
    text(c, LEFT, y - 10, title.upper(), 8.5, "Arial-Bold", ACCENT)
    return y - 30


def wrapped(c, x, y, value, width, size=9.1, leading=12.4, color=INK, font="Arial"):
    words = value.split()
    line = ""
    for word in words:
        trial = f"{line} {word}".strip()
        if pdfmetrics.stringWidth(trial, font, size) > width and line:
            text(c, x, y, line, size, font, color)
            y -= leading
            line = word
        else:
            line = trial
    if line:
        text(c, x, y, line, size, font, color)
        y -= leading
    return y


def bullet(c, y, value):
    c.setFillColor(ACCENT)
    c.circle(LEFT + 3, y + 3, 1.5, fill=1, stroke=0)
    return wrapped(c, LEFT + 14, y, value, RIGHT - LEFT - 14) - 3


def role(c, y, title, dates, employer):
    text(c, LEFT, y, title, 9.4, "Arial-Bold")
    c.setFont("Arial", 8.4)
    c.setFillColor(MUTED)
    c.drawRightString(RIGHT, y, dates)
    text(c, LEFT, y - 13, employer, 8.6, color=MUTED)
    return y - 29


OUTPUT.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(OUTPUT), pagesize=letter, pageCompression=1)
c.setTitle("Olen Latham | Software, Systems & Cloud Resume")
c.setAuthor("Olen Latham")
c.setSubject("Public career resume featuring OMG and DeployLint")

text(c, LEFT, 741, "OLEN LATHAM", 20, "Arial-Bold")
text(c, LEFT, 723, "Developer tools  /  cloud systems  /  customer support", 9.4, color=MUTED)
text(c, LEFT, 703, "McKinney, TX  |  olen@latham.cloud", 9.2)
link(c, LEFT, 687, "latham.cloud", "https://latham.cloud/")
link(c, 140, 687, "GitHub", "https://github.com/PyRo1121")
link(c, 200, 687, "LinkedIn", "https://www.linkedin.com/in/olen-latham-9b647654/")

y = section(c, 668, "Profile")
y = wrapped(c, LEFT, y, "Customer-service specialist with 13+ years of experience resolving complex issues, working across systems, and explaining next steps clearly. I build developer tools and cloud products in Rust and TypeScript, with a focus on reliable workflows, CI/CD, and inspectable decisions.", RIGHT - LEFT, 9.1, 12.4) - 7

y = section(c, y, "Selected technical work")
text(c, LEFT, y, "OMG  |  Rust CLI for development environments", 9.4, "Arial-Bold")
link(c, 417, y, "getomg.xyz", "https://getomg.xyz/")
y -= 16
y = bullet(c, y, "Built a public beta that brings system packages, language runtimes, project tasks, and vulnerability evidence into one CLI across Linux and Apple silicon macOS.")
y = bullet(c, y, "Implemented native package backends, integration tests, documentation, and tagged release tooling. Public source: github.com/omg-cli/omg.") - 3

text(c, LEFT, y, "DeployLint  |  Repository-aware CI/CD setup", 9.4, "Arial-Bold")
link(c, 422, y, "deploylint.com", "https://deploylint.com/")
y -= 16
y = bullet(c, y, "Built a GitHub-connected flow that inspects repository evidence, previews generated GitHub Actions files and credential needs, then opens a setup pull request for review.")
y = bullet(c, y, "Added protected deployment decisions tied to repository, commit, and policy evidence. Stack: TypeScript, SvelteKit, GitHub Apps, and Cloudflare Workers.") - 6

y = section(c, y, "Professional experience")
y = role(c, y, "Senior Customer Service Specialist / NS&S", "Feb 2022 - present", "Bank of America")
y = bullet(c, y, "Handle complex escalated consumer and internal partner requests across multiple systems; set expectations and work within established service levels.") - 3

y = role(c, y, "Guest Service Specialist", "Nov 2018 - Feb 2022", "Walt Disney World")
y = bullet(c, y, "Resolved research-driven consumer and internal partner cases, using multiple service systems and clear follow-through.") - 3

y = role(c, y, "Customer service, fraud, and escalation roles", "Dec 2012 - Nov 2018", "Bank of America")
y = bullet(c, y, "Progressed through customer service, fraud analysis, and executive escalation roles; supported coaching, claim intake, complex cases, and procedure improvements.") - 6

y = section(c, y, "Skills & education")
y = wrapped(c, LEFT, y, "Rust, TypeScript, SvelteKit, Cloudflare Workers, GitHub Actions, GitHub Apps, CLI design, troubleshooting, technical documentation, customer communication", RIGHT - LEFT, 8.9, 12.2) - 3
y = wrapped(c, LEFT, y, "High School Diploma  |  Richland High School  |  May 2008", RIGHT - LEFT, 8.8, 12.2, MUTED)

if y < 35:
    raise RuntimeError(f"Resume overflow: final baseline {y}")
c.save()
print(f"Created {OUTPUT} with final baseline {y:.1f}")
