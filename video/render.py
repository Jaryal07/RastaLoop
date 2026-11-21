"""Build the launch film and explainer from the tested browser recording and original artwork."""

import json
import os
from pathlib import Path
import subprocess
import textwrap
import wave

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
CAPTURE = Path('tmp/browser')
WORK = Path('tmp/video')
OUT = Path('output/video')
FFMPEG = os.environ.get('RASTALOOP_FFMPEG', 'ffmpeg')
DEMO = os.environ.get('RASTALOOP_FILM_URL', 'Open RastaLoop and choose Try the demo')
PAPER, INK, TEAL, MINT, AMBER = '#fbfaf5', '#142e30', '#163b3a', '#d9ece1', '#ffedcc'

LAUNCH = [
    (10, 'Can you still get to the clinic?', 'An illustrative curb-ramp obstruction', 'photo', 'A clinic can be close by, and still hard to reach. A barrier across one ramp can change the whole trip.'),
    (10, '320 m to the clinic', 'Step-free access in the modeled corridor', 'demo-initial', 'In our simulated neighborhood, the market entrance is three hundred and twenty metres from the clinic on a step-free route.'),
    (9, 'One shared report', 'A resident selects the blocked curb ramp', 'demo-report', 'A resident reports what they observed. Someone else can add to the same case, keeping evidence together.'),
    (10, 'A trip disappears', 'The bus stop is still 250 m away', 'demo-verified', 'A reviewer confirms the obstruction. RastaLoop recalculates both trips. The bus stop stays reachable, while the surveyed step-free route to the clinic disappears.'),
    (10, 'Which repair comes first?', 'The alternate route uses stairs', 'demo-alternate', 'The five hundred and ninety metre alternate path uses steps. Clearing the ramp would restore the step-free clinic trip, so the case moves up the queue.'),
    (9, 'Check the passage again', 'A second reviewer can return the case', 'demo-failed', 'A repair entry keeps the case active. A separate rechecker can send it back when the passage is still blocked.'),
    (9, '320 m, restored', 'The route returns after a passed recheck', 'clear-photo', 'When the recheck passes, the step-free route comes back. The history shows who checked it and when.'),
    (8, 'See what opens the way.', DEMO, 'close', 'Try the RastaLoop sandbox and see what changes when a street opens up again.'),
]

INTRO = [
    (10, 'An essential trip can hinge on one ramp', 'CityFix · RastaLoop', 'photo', 'If a ramp becomes unusable, a short trip to a clinic can disappear from someone’s set of options.'),
    (10, 'What we are testing', 'Local corridor walk and interviews are pending', None, 'Published tools help people report barriers and plan accessible trips. Our local interviews and corridor walk will test what information people still need.'),
    (10, 'Prioritize the trip a fix restores', 'One verified case, two destinations, one clear reason for priority', 'demo-verified', 'RastaLoop asks what would change if we cleared just this case. The answer is a destination, a shorter trip, or no change in this model.'),
    (10, 'Follow the clinic curb ramp', 'Working demo · simulated corridor and team roles', 'demo-initial', 'Watch the step-free clinic route and the bus stop. We will report a ramp, verify it, record a repair, and have a separate person check the passage.'),
]
DEMO_CUES = [
    (0, 'The clinic starts at three hundred and twenty metres. The bus stop is two hundred and fifty.'),
    (6, 'Asha chooses the clinic curb ramp and submits a blocked passage report.'),
    (12, 'A matching report can add evidence to the existing case.'),
    (18, 'Isha verifies the obstruction. The clinic’s surveyed step-free route disappears and the bus trip stays available.'),
    (27.5, 'With steps allowed, there is a five hundred and ninety metre alternative.'),
    (34, 'Dev assigns maintenance, then records sample repair evidence.'),
    (39.5, 'The repaired case is awaiting recheck. The clinic trip remains unavailable.'),
    (46, 'Noor still finds an obstruction. The case returns to the repair queue.'),
    (54, 'The operator can record another attempt. Only a separate recheck can close it.'),
    (62, 'This time the passage is clear. The step-free clinic route returns to three hundred and twenty metres.'),
    (71, 'The history preserves both rechecks and the time of each action.'),
]
OUTRO = [
    (13, '320 m → unavailable → 320 m', 'Modeled step-free clinic trip · bus stop remains 250 m', 'demo-restored', 'The modeled clinic trip returns, while the bus stop stays two hundred and fifty metres away. The queue ranks the ramp first because clearing it restores the clinic trip.'),
    (12, 'One corridor, with clear limits', 'Synthetic observations and sample evidence', None, 'The map covers one synthetic network. These distances describe the model. The next test is a real corridor walk and five independent usability sessions.'),
    (10, 'Try the closure loop yourself', DEMO, 'close', 'Start the demo. Create the ramp case, try the failed recheck, and see how a confirmed repair changes the route.'),
]


def run(*args):
    subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)], check=True)


def text_lines(canvas, content, xy, size, width, fill, bold=False):
    family = 'segoeuib.ttf' if bold else 'segoeui.ttf'
    path = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts' / family
    font = ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default(size=size)
    words = content.split()
    x, y = xy
    line = ''
    for word in words:
        candidate = f'{line} {word}'.strip()
        if line and canvas.textlength(candidate, font=font) > width:
            canvas.text((x, y), line, fill=fill, font=font)
            y += round(size * 1.18)
            line = word
        else:
            line = candidate
    canvas.text((x, y), line, fill=fill, font=font)


def slate(path, title, caption, key, portrait):
    width, height = (1080, 1920) if portrait else (1600, 900)
    light = key != 'close'
    image = Image.new('RGB', (width, height), PAPER if light else TEAL)
    draw = ImageDraw.Draw(image)
    fg, sub = (INK, TEAL) if light else (PAPER, MINT)
    margin = 70
    brand = Image.open('design/route-loop.png').convert('RGBA').resize((60, 60), Image.Resampling.LANCZOS)
    image.paste(brand, (margin, 65), brand)
    text_lines(draw, 'RastaLoop', (margin + 77, 69), 36, 350, fg, True)
    text_lines(draw, title, (margin, 177), 78 if portrait else 71, 940 if portrait else 640, fg, True)
    text_lines(draw, caption, (margin, 414), 42 if portrait else 32, 940 if portrait else 585, sub)

    if key in ('photo', 'clear-photo'):
        source = Image.open('public/corridor.webp' if key == 'photo' else 'public/corridor-clear.webp').convert('RGB')
    elif key and key != 'close':
        source = Image.open(CAPTURE / f'{key}.png').convert('RGB')
        if portrait:
            source = source.crop((100, 265, 810, 800))
    else:
        source = None

    if source is not None:
        bounds = (940, 950) if portrait else (790, 620)
        xy = (margin, 570) if portrait else (735, 90)
        if key in ('photo', 'clear-photo'):
            source = ImageOps.fit(source, bounds, Image.Resampling.LANCZOS)
        else:
            source = ImageOps.contain(source, bounds, Image.Resampling.LANCZOS)
        border = Image.new('L', source.size)
        ImageDraw.Draw(border).rounded_rectangle((0, 0, *source.size), radius=29, fill=255)
        image.paste(source, (xy[0] + (bounds[0] - source.width) // 2, xy[1] + (bounds[1] - source.height) // 2), border)
    else:
        centre = (540, 1060) if portrait else (1165, 435)
        x, y = centre
        for radius, color in ((250, MINT), (189, '#8bb5a4'), (130, AMBER)):
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), outline=color, width=4)
        draw.ellipse((x + 127, y - 150, x + 159, y - 118), fill='#ae7942')

    text_lines(draw, 'CityFix Buildathon 2026  /  Simulated corridor', (margin, height - (287 if portrait else 76)), 26 if portrait else 20, width - 2 * margin, sub)
    image.save(path)


def picture_clip(path, picture, seconds):
    run('-loop', '1', '-framerate', '24', '-i', picture, '-t', seconds, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '20', '-pix_fmt', 'yuv420p', path)


def live_clip(target):
    recording = json.loads((CAPTURE / 'recording.json').read_text())
    frames = recording['frames']
    if not frames:
        raise ValueError('The browser emitted no frames.')
    lines = ['ffconcat version 1.0']
    for frame, following in zip(frames, frames[1:] + [{'seconds': 80}]):
        absolute = (ROOT / frame['path']).as_posix()
        lines.extend([f"file '{absolute}'", f"duration {max(1 / 120, following['seconds'] - frame['seconds']):.5f}"])
    lines.append(f"file '{(ROOT / frames[-1]['path']).as_posix()}'")
    source = WORK / 'browser.ffconcat'
    source.write_text('\n'.join(lines), encoding='utf-8')
    run('-f', 'concat', '-safe', '0', '-i', source, '-vf', 'scale=1440:900:force_original_aspect_ratio=decrease,pad=1600:900:(ow-iw)/2:(oh-ih)/2:0x163b3a,setsar=1,fps=24,tpad=stop_mode=clone:stop_duration=1',
        '-t', '80', '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '20', '-pix_fmt', 'yuv420p', target)


def timestamp(seconds):
    milli = round(seconds * 1000)
    return f'{milli // 3600000:02d}:{milli // 60000 % 60:02d}:{milli // 1000 % 60:02d},{milli % 1000:03d}'


def narration(name, cues, duration, portrait):
    recipe = WORK / f'{name}.json'
    directory = WORK / f'{name}-voices'
    directory.mkdir(exist_ok=True)
    recipe.write_text(json.dumps([line for _, line in cues], ensure_ascii=False), encoding='utf-8')
    subprocess.run(['powershell.exe', '-NoProfile', '-File', 'video/voice.ps1', str(recipe.resolve()), str(directory.resolve())], check=True)
    audio = WORK / f'{name}.wav'
    captions = OUT / f'{name}.srt'
    subtitles = []
    with wave.open(str(directory / '0.wav'), 'rb') as first:
        channels, width, rate = first.getnchannels(), first.getsampwidth(), first.getframerate()
    frame_size = width * channels
    with wave.open(str(audio), 'wb') as final:
        final.setparams((channels, width, rate, 0, 'NONE', 'not compressed'))
        cursor = 0
        for index, (when, line) in enumerate(cues):
            position = round(when * rate)
            if position < cursor:
                raise ValueError(f'Voice runs into the next scene: {line}')
            final.writeframes(bytes((position - cursor) * frame_size))
            voice_path = directory / f'{index}.wav'
            end = cues[index + 1][0] if index + 1 < len(cues) else duration
            with wave.open(str(voice_path), 'rb') as clip:
                seconds = clip.getnframes() / rate
            if seconds > end - when - .15:
                compressed = directory / f'{index}-fit.wav'
                run('-i', voice_path, '-af', f'atempo={seconds / (end - when - .2):.5f}', compressed)
                voice_path = compressed
            with wave.open(str(voice_path), 'rb') as spoken:
                frames = spoken.getnframes()
                final.writeframes(spoken.readframes(frames))
            cursor = position + frames
            caption = textwrap.fill(line, 35 if portrait else 65)
            subtitles.append(f'{index + 1}\n{timestamp(when)} --> {timestamp(cursor / rate)}\n{caption}\n')
        final.writeframes(bytes(max(0, round(duration * rate) - cursor) * frame_size))
    captions.write_text('\n'.join(subtitles), encoding='utf-8')
    return audio, captions


def film(name, opening, ending=(), use_demo=False, portrait=False):
    parts, cues = [], []
    at = 0

    def scenes(items):
        nonlocal at
        for seconds, title, caption, key, spoken in items:
            label = WORK / f'{name}-{at:03}'
            slate(label.with_suffix('.jpg'), title, caption, key, portrait)
            picture_clip(label.with_suffix('.mp4'), label.with_suffix('.jpg'), seconds)
            parts.append(label.with_suffix('.mp4'))
            cues.append((at + .6, spoken))
            at += seconds

    scenes(opening)
    if use_demo:
        screen = WORK / 'working-demo.mp4'
        live_clip(screen)
        parts.append(screen)
        cues.extend((at + when, line) for when, line in DEMO_CUES)
        at += 80
    scenes(ending)
    manifest = WORK / f'{name}.ffconcat'
    manifest.write_text('ffconcat version 1.0\n' + '\n'.join(f"file '{part.name}'" for part in parts), encoding='utf-8')
    audio, captions = narration(name, cues, at, portrait)
    target = OUT / f'{name}.mp4'
    size = 10 if portrait else 14
    style = f'FontName=Segoe UI,FontSize={size},Bold=1,Outline=1,Shadow=0,BorderStyle=3,BackColour=&H30172F2D,MarginV=20'
    run('-f', 'concat', '-safe', '0', '-i', manifest, '-i', audio, '-vf', f"subtitles={captions.as_posix()}:force_style='{style}'",
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-c:a', 'aac', '-b:a', '128k', '-af', 'volume=1.1', '-t', at, '-movflags', '+faststart', target)
    print(f'{target}: {at} seconds')


if __name__ == '__main__':
    WORK.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    film('RastaLoop-launch', LAUNCH, portrait=True)
    film('RastaLoop-explainer', INTRO, OUTRO, use_demo=True)
