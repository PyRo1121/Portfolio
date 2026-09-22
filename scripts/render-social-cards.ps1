Add-Type -AssemblyName System.Drawing

$staticRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'static'
$cards = @(
    @{
        Path = 'og-image.png'
        Accent = '#D8A54A'
        Kicker = 'OLEN LATHAM / SELECTED WORK'
        Heading = 'OMG + DeployLint'
        Line1 = 'Developer tools and CI/CD systems'
        Line2 = 'built for clarity and review.'
        Footer = 'LATHAM.CLOUD'
    },
    @{
        Path = 'portfolio/omg-social.png'
        Accent = '#FF6745'
        Kicker = 'OLEN LATHAM / CASE STUDY'
        Heading = 'OMG'
        Line1 = 'Packages. Runtimes.'
        Line2 = 'One command.'
        Footer = 'LATHAM.CLOUD/WORK/OMG  /  GETOMG.XYZ'
    },
    @{
        Path = 'portfolio/deploylint-social.png'
        Accent = '#C9F470'
        Kicker = 'OLEN LATHAM / CASE STUDY'
        Heading = 'DeployLint'
        Line1 = 'CI/CD setup shaped by'
        Line2 = 'your repository.'
        Footer = 'LATHAM.CLOUD/WORK/DEPLOYLINT  /  DEPLOYLINT.COM'
    }
)

foreach ($card in $cards) {
    $bitmap = [System.Drawing.Bitmap]::new(1200, 630)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $background = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#101315'))
    $foreground = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#F4F4EF'))
    $muted = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#B3B9B6'))
    $accent = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($card.Accent))
    $line = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#35403F'), 2)
    $kickerFont = [System.Drawing.Font]::new('Segoe UI', 25, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $headingFont = [System.Drawing.Font]::new('Segoe UI', 88, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $bodyFont = [System.Drawing.Font]::new('Segoe UI', 47, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $footerFont = [System.Drawing.Font]::new('Segoe UI', 23, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

    try {
        $graphics.FillRectangle($background, 0, 0, 1200, 630)
        $graphics.FillRectangle($accent, 0, 0, 12, 630)
        $graphics.DrawLine($line, 72, 74, 1128, 74)
        $graphics.DrawString($card.Kicker, $kickerFont, $accent, [System.Drawing.PointF]::new(75, 100))
        $graphics.DrawString($card.Heading, $headingFont, $foreground, [System.Drawing.PointF]::new(70, 170))
        $graphics.DrawString($card.Line1, $bodyFont, $foreground, [System.Drawing.PointF]::new(76, 300))
        $graphics.DrawString($card.Line2, $bodyFont, $muted, [System.Drawing.PointF]::new(76, 365))
        $graphics.DrawLine($line, 72, 520, 1128, 520)
        $graphics.DrawString($card.Footer, $footerFont, $accent, [System.Drawing.PointF]::new(76, 555))

        $destination = Join-Path $staticRoot $card.Path
        $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Output $destination
    }
    finally {
        $footerFont.Dispose()
        $bodyFont.Dispose()
        $headingFont.Dispose()
        $kickerFont.Dispose()
        $line.Dispose()
        $accent.Dispose()
        $muted.Dispose()
        $foreground.Dispose()
        $background.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}
