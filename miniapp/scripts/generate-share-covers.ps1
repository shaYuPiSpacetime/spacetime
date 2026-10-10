# 生成分享卡片兜底图（非页面截图、非静态图标）；1000×800，无外部素材或网络依赖。
Add-Type -AssemblyName System.Drawing
$output = Join-Path $PSScriptRoot '../src/assets/share'
New-Item -ItemType Directory -Force -Path $output | Out-Null
$cards = @(
    @('profile', '个人主页', '遇见真实的你', '从一份自我介绍，开始认识彼此', '查看 TA 的主页'),
    @('post', '生活动态', '分享生活的闪光', '记录日常，也遇见懂你的人', '来看看这份分享'),
    @('topic', '千寻话题', '让相遇更有共鸣', '聊聊共同的话题，发现相似的心意', '一起参与讨论'),
    @('invite', '好友邀请', '一起遇见好缘分', '来时空邂逅，开启新的相遇', '开启你的缘分之旅')
)
function Draw-Label($graphics, $value, $size, $color, $x, $y, $bold = $false) {
    $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
    $font = [System.Drawing.Font]::new('Microsoft YaHei', $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($color))
    $graphics.DrawString($value, $font, $brush, $x, $y)
    $font.Dispose()
    $brush.Dispose()
}
foreach ($card in $cards) {
    $bitmap = [System.Drawing.Bitmap]::new(1000, 800)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $rect = [System.Drawing.Rectangle]::new(0, 0, 1000, 800)
    $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, [System.Drawing.ColorTranslator]::FromHtml('#E7F4FF'), [System.Drawing.ColorTranslator]::FromHtml('#F5F0FF'), 40)
    $graphics.FillRectangle($gradient, $rect)
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(90, 129, 158, 238), 3)
    $graphics.DrawEllipse($pen, 640, -100, 480, 480)
    $graphics.DrawEllipse($pen, 700, -40, 360, 360)
    $dot = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#2876FF'))
    $graphics.FillEllipse($dot, 706, 265, 22, 22)
    $graphics.FillEllipse($dot, 72, 82, 18, 18)
    Draw-Label $graphics '时空邂逅' 30 '#245FC5' 105 67 $true
    Draw-Label $graphics $card[1] 28 '#657994' 72 235
    Draw-Label $graphics $card[2] 66 '#163568' 66 296 $true
    Draw-Label $graphics $card[3] 29 '#61758E' 72 408
    $graphics.FillRectangle($dot, 72, 514, 7, 44)
    Draw-Label $graphics $card[4] 32 '#2876FF' 101 512 $true
    Draw-Label $graphics '让每一次相遇，都多一点可能' 25 '#8190A5' 72 698
    $bitmap.Save((Join-Path $output ($card[0] + '.png')), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose(); $bitmap.Dispose(); $gradient.Dispose(); $pen.Dispose(); $dot.Dispose()
}
