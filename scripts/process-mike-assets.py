#!/usr/bin/env python3

from __future__ import annotations

from pathlib import Path
import colorsys
import json
import statistics

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "mike assets"
PROCESSED_DIR = ROOT / "src" / "assets" / "mike" / "processed"
HERO_DIR = PROCESSED_DIR / "hero"
EMBLEM_DIR = PROCESSED_DIR / "emblem"
ICON_DIR = PROCESSED_DIR / "icon"
PUBLIC_DIR = ROOT / "public"
MANIFEST_PATH = ROOT / "src" / "assets" / "mike" / "manifest.ts"

TARGETS = {
    "generic": "general",
    "math": "mathematics",
    "physics": "physics",
    "chemistry": "chemistry",
    "history": "history",
    "philosophy": "philosophy",
}

def ensure_dirs() -> None:
    for directory in [HERO_DIR, EMBLEM_DIR, ICON_DIR, PUBLIC_DIR]:
        directory.mkdir(parents=True, exist_ok=True)


def key_green(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    samples = []
    for x, y in [
        (4, 4),
        (width // 2, 4),
        (width - 5, 4),
        (4, height // 2),
        (width - 5, height // 2),
        (4, height - 5),
        (width // 2, height - 5),
        (width - 5, height - 5),
    ]:
        samples.append(pixels[x, y][:3])
    bg_r = statistics.mean(sample[0] for sample in samples)
    bg_g = statistics.mean(sample[1] for sample in samples)
    bg_b = statistics.mean(sample[2] for sample in samples)

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue

            bg_distance = ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            green_dominant = g > r * 1.08 and g > b * 1.02
            is_green = 0.21 <= h <= 0.43 and s >= 0.2 and v >= 0.22
            close_to_bg = bg_distance < 120
            if not ((is_green and green_dominant) or close_to_bg):
                continue

            green_push = max(0, g - max(r, b))
            if is_green and green_dominant and green_push >= 10:
                pixels[x, y] = (r, g, b, 0)
                continue

            hue_strength = max(0.0, 1.0 - abs(h - 0.32) / 0.13) if is_green else 0.0
            bg_strength = max(0.0, 1.0 - bg_distance / 145)
            alpha_scale = 1.0 - max(hue_strength, bg_strength)
            new_alpha = int(a * alpha_scale)
            pixels[x, y] = (r, g, b, new_alpha)
    alpha = image.getchannel("A").filter(ImageFilter.GaussianBlur(1.8))
    image.putalpha(alpha)
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if g > max(r, b) + 6:
                neutral = int((r + b) / 2)
                softened_g = int((neutral + g) / 2)
                spill_limit = neutral + (6 if a < 220 else 10)
                pixels[x, y] = (max(r, neutral - 4), min(softened_g, spill_limit), max(b, neutral - 4), a)
    return image


def remove_corner_star(image: Image.Image) -> Image.Image:
    width, height = image.size
    mask = Image.new("L", image.size, 255)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        (
            int(width * 0.84),
            int(height * 0.82),
            width,
            height,
        ),
        radius=int(min(width, height) * 0.06),
        fill=0,
    )
    alpha = image.getchannel("A")
    alpha = ImageChops.multiply(alpha, mask)
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.2))
    image.putalpha(alpha)
    return image


def crop_to_content(image: Image.Image, padding_ratio: float = 0.06) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        return image
    left, top, right, bottom = bbox
    pad_x = int((right - left) * padding_ratio)
    pad_y = int((bottom - top) * padding_ratio)
    left = max(0, left - pad_x)
    top = max(0, top - pad_y)
    right = min(image.width, right + pad_x)
    bottom = min(image.height, bottom + pad_y)
    return image.crop((left, top, right, bottom))


def contain_on_canvas(image: Image.Image, size: tuple[int, int], padding: float = 0.08) -> Image.Image:
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    inner_w = int(size[0] * (1 - padding * 2))
    inner_h = int(size[1] * (1 - padding * 2))
    scale = min(inner_w / image.width, inner_h / image.height)
    resized = image.resize(
        (max(1, int(image.width * scale)), max(1, int(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    x = (size[0] - resized.width) // 2
    y = (size[1] - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def create_emblem(source: Image.Image) -> Image.Image:
    # Use the minimalist geometric logo for the emblem
    return create_micro_icon(1024)


def create_app_icon(maskable: bool = False) -> Image.Image:
    icon = create_micro_icon(1024)
    if not maskable:
        return icon

    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    padded = contain_on_canvas(icon, (880, 880), padding=0.0)
    canvas.alpha_composite(padded, ((1024 - padded.width) // 2, (1024 - padded.height) // 2))
    return canvas


def create_micro_icon(size: int) -> Image.Image:
    logo_path = SOURCE_DIR / "logo.png"
    if not logo_path.exists():
        # Fallback if logo not provided
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        inset = max(1, size // 16)
        radius = max(4, size // 4)
        draw.rounded_rectangle(
            (inset, inset, size - inset, size - inset),
            radius=radius,
            fill=(122, 31, 52, 255),
            outline=(51, 38, 32, 255),
            width=max(1, size // 18),
        )
        return canvas

    icon = Image.open(logo_path).convert("RGBA")
    # Identify magenta and key it out
    pixels = icon.load()
    for y in range(icon.height):
        for x in range(icon.width):
            r, g, b, a = pixels[x, y]
            if r > 220 and b > 220 and g < 50:
                pixels[x, y] = (r, g, b, 0)
    
    # Resize to padded size inside the square
    icon = crop_to_content(icon, 0.0)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    resized = icon.resize((size, size), Image.Resampling.LANCZOS)
    
    # We round the corners to make it an app icon
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size, size), radius=max(4, size // 5), fill=255)
    
    output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    output.paste(resized, (0, 0), mask=mask)
    return output


def save_image(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() == ".png":
      image.save(path, optimize=True)
      return
    image.save(path)


def export_png_and_webp(base_path: Path, image: Image.Image) -> dict[str, str]:
    png_path = base_path.with_suffix(".png")
    webp_path = base_path.with_suffix(".webp")
    save_image(image, png_path)
    image.save(webp_path, quality=88, method=6)
    return {"png": png_path.name, "webp": webp_path.name}


def process_sources() -> dict[str, dict[str, str]]:
    outputs: dict[str, dict[str, str]] = {}
    for source_name, alias in TARGETS.items():
        source = Image.open(SOURCE_DIR / f"{source_name}.png")
        keyed = key_green(source)
        hero = contain_on_canvas(crop_to_content(keyed, 0.04), (1280, 960), padding=0.08)
        outputs[alias] = export_png_and_webp(HERO_DIR / alias, hero)
    return outputs


def write_manifest(hero_outputs: dict[str, dict[str, str]], emblem_outputs: dict[str, str]) -> None:
    content = f"""export const mikeAssetManifest = {{
  emblem: {{
    png: new URL("./processed/emblem/{emblem_outputs['png']}", import.meta.url).href,
    webp: new URL("./processed/emblem/{emblem_outputs['webp']}", import.meta.url).href,
  }},
  icon: {{
    app192: "/android-chrome-192x192.png",
    app512: "/android-chrome-512x512.png",
    maskable512: "/android-chrome-maskable-512x512.png",
    favicon16: "/favicon-16x16.png",
    favicon32: "/favicon-32x32.png",
  }},
  heroes: {{
"""
    for alias, paths in hero_outputs.items():
        content += f"""    {alias}: {{
      png: new URL("./processed/hero/{paths['png']}", import.meta.url).href,
      webp: new URL("./processed/hero/{paths['webp']}", import.meta.url).href,
    }},
"""
    content += """  },
} as const;

export type MikeAssetSubject = keyof typeof mikeAssetManifest.heroes;
"""
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(content)


def write_favicon_ico(source: Image.Image) -> None:
    source.save(PUBLIC_DIR / "favicon.ico", sizes=[(16, 16), (32, 32)])


def main() -> None:
    ensure_dirs()
    hero_outputs = process_sources()

    keyed_logo = crop_to_content(remove_corner_star(key_green(Image.open(SOURCE_DIR / "mikelogo.png"))), 0.02)
    emblem = create_emblem(keyed_logo)
    emblem_outputs = export_png_and_webp(EMBLEM_DIR / "mike-emblem", emblem)

    app_icon = create_app_icon()
    maskable_icon = create_app_icon(maskable=True)
    app_icon_512 = app_icon.resize((512, 512), Image.Resampling.LANCZOS)
    app_icon_192 = app_icon.resize((192, 192), Image.Resampling.LANCZOS)
    maskable_512 = maskable_icon.resize((512, 512), Image.Resampling.LANCZOS)
    touch_180 = app_icon.resize((180, 180), Image.Resampling.LANCZOS)
    favicon_32 = create_micro_icon(32)
    favicon_16 = create_micro_icon(16)

    save_image(app_icon, ICON_DIR / "app-icon-1024.png")
    save_image(maskable_icon, ICON_DIR / "app-maskable-1024.png")
    save_image(app_icon_512, PUBLIC_DIR / "android-chrome-512x512.png")
    save_image(maskable_512, PUBLIC_DIR / "android-chrome-maskable-512x512.png")
    save_image(app_icon_192, PUBLIC_DIR / "android-chrome-192x192.png")
    save_image(touch_180, PUBLIC_DIR / "apple-touch-icon.png")
    save_image(app_icon_512, PUBLIC_DIR / "logo.png")
    save_image(favicon_32, PUBLIC_DIR / "favicon-32x32.png")
    save_image(favicon_16, PUBLIC_DIR / "favicon-16x16.png")
    write_favicon_ico(create_micro_icon(64))
    write_manifest(hero_outputs, emblem_outputs)

    report = {
        "heroes": hero_outputs,
        "emblem": emblem_outputs,
        "icons": {
            "app192": "android-chrome-192x192.png",
            "app512": "android-chrome-512x512.png",
            "maskable512": "android-chrome-maskable-512x512.png",
            "favicon16": "favicon-16x16.png",
            "favicon32": "favicon-32x32.png",
        },
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
